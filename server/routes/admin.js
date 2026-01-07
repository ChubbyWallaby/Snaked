import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
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

        // Note: Stripe integration removed - manual completion only
        console.log('Withdrawal approved manually (no Stripe integration)')
        const updated = await updateTransaction(txId, {
            status: 'completed',
            updatedAt: new Date().toISOString()
        })

        res.json({ success: true, transaction: updated, note: 'Manual completion (Stripe removed in Phase 1)' })

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
