import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getStripe } from '../utils/stripe.js'
import { getUser, getAllTransactions, getTransactions, getTransaction, updateTransaction, updateUser } from '../db/index.js'

const router = express.Router()

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const user = await getUser(req.user.id)
        if (user && user.role === 'admin') {
            next()
        } else {
            res.status(403).json({ message: 'Admin access required' })
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error' })
    }
}

// Get all withdrawals (pending and completed)
router.get('/withdrawals', authenticateToken, isAdmin, async (req, res) => {
    try {
        const transactions = await getAllTransactions()
        const withdrawals = transactions.filter(tx => tx.type === 'withdrawal')

        // Enrich with usernames
        const enriched = await Promise.all(withdrawals.map(async (tx) => {
            const user = await getUser(tx.userId)
            return {
                ...tx,
                username: user ? user.username : 'Unknown'
            }
        }))

        res.json({ withdrawals: enriched })
    } catch (err) {
        console.error('Fetch withdrawals error:', err)
        res.status(500).json({ message: 'Failed to fetch withdrawals' })
    }
})

// Approve/Complete withdrawal
router.post('/withdrawals/:id/approve', authenticateToken, isAdmin, async (req, res) => {
    try {
        const txId = req.params.id
        const tx = await getTransaction(txId)

        if (!tx) {
            return res.status(404).json({ message: 'Transaction not found' })
        }

        if (tx.status !== 'pending') {
            return res.status(400).json({ message: 'Transaction already processed' })
        }

        const stripeClient = getStripe()
        if (!stripeClient) {
            console.log('Stripe not configured, marking withdrawal as completed manually')
            const updated = await updateTransaction(txId, {
                status: 'completed',
                updatedAt: new Date().toISOString()
            })
            return res.json({ success: true, transaction: updated, note: 'Manual completion (Stripe not configured)' })
        }

        // Refund-based withdrawal logic
        const userTransactions = await getTransactions(tx.userId)
        // Only look at real stripe deposits (not test ones)
        const deposits = userTransactions.filter(t =>
            t.type === 'deposit' &&
            t.stripePaymentId &&
            !t.stripePaymentId.startsWith('test_')
        )

        let amountToRefund = Math.abs(tx.amount)
        console.log(`[REFUND DEBUG] Approval triggered for tx: ${txId}`)
        console.log(`[REFUND DEBUG] Request Amount (tx.amount): ${tx.amount} (${typeof tx.amount})`)
        console.log(`[REFUND DEBUG] Parsed amountToRefund: ${amountToRefund} (${typeof amountToRefund})`)

        const refunds = []

        for (const deposit of deposits) {
            if (amountToRefund <= 0.01) break

            console.log(`[REFUND DEBUG] Processing deposit ${deposit.id}`)
            console.log(`[REFUND DEBUG] Deposit Amount: ${deposit.amount} (${typeof deposit.amount})`)
            console.log(`[REFUND DEBUG] Deposit PI: ${deposit.stripePaymentId}`)

            try {
                const refundAmount = Math.min(amountToRefund, deposit.amount)
                console.log(`[REFUND DEBUG] Math.min(${amountToRefund}, ${deposit.amount}) = ${refundAmount}`)

                const refund = await stripeClient.refunds.create({
                    payment_intent: deposit.stripePaymentId,
                    amount: Math.round(refundAmount * 100)
                })
                console.log(`[REFUND DEBUG] Stripe refund created: ${refund.id} for $${refundAmount}`)

                refunds.push({
                    depositId: deposit.id,
                    stripePaymentId: deposit.stripePaymentId,
                    refundId: refund.id,
                    amount: refundAmount
                })

                amountToRefund -= refundAmount
            } catch (err) {
                console.error(`Failed to refund deposit ${deposit.id}:`, err.message)
                // Continue to next deposit if this one fails
            }
        }

        if (amountToRefund > 0.01 && refunds.length > 0) {
            // Partially fulfilled
            const updated = await updateTransaction(txId, {
                status: 'partially_completed',
                stripeRefunds: refunds,
                remainingAmount: parseFloat(amountToRefund.toFixed(2)),
                updatedAt: new Date().toISOString()
            })
            return res.json({
                success: true,
                transaction: updated,
                message: `Refunded $${(Math.abs(tx.amount) - amountToRefund).toFixed(2)}, remaining $${amountToRefund.toFixed(2)} needs manual fulfillment.`
            })
        } else if (amountToRefund <= 0.01) {
            const updated = await updateTransaction(txId, {
                status: 'completed',
                stripeRefunds: refunds,
                updatedAt: new Date().toISOString()
            })
            return res.json({ success: true, transaction: updated })
        } else {
            return res.status(400).json({
                message: 'No refundable Stripe deposits found for this user. You may need to fulfill this payout manually.'
            })
        }

    } catch (err) {
        console.error('Approve withdrawal error:', err)
        res.status(500).json({ message: 'Failed to approve withdrawal' })
    }
})

// Reject withdrawal (refunds the user)
router.post('/withdrawals/:id/reject', authenticateToken, isAdmin, async (req, res) => {
    try {
        const tx = await updateTransaction(req.params.id, {
            status: 'rejected',
            updatedAt: new Date().toISOString()
        })

        if (!tx) {
            return res.status(404).json({ message: 'Transaction not found' })
        }

        // Refund the user
        const user = await getUser(tx.userId)
        if (user) {
            await updateUser(tx.userId, {
                balance: user.balance + Math.abs(tx.amount)
            })
        }

        res.json({ success: true, transaction: tx })
    } catch (err) {
        console.error('Reject withdrawal error:', err)
        res.status(500).json({ message: 'Failed to reject withdrawal' })
    }
})

export default router
