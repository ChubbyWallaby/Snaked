import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authenticateToken } from '../middleware/auth.js'
import { getUser, updateUser, addTransaction, getTransactions, getUserByStripeAccountId } from '../db/index.js'
import { getStripe } from '../utils/stripe.js'

const router = express.Router()

// Get balance
router.get('/balance', authenticateToken, async (req, res) => {
    try {
        const user = await getUser(req.user.id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        res.json({ balance: user.balance })
    } catch (err) {
        console.error('Get balance error:', err)
        res.status(500).json({ message: 'Server error' })
    }
})

// Get onboarding link
router.get('/onboarding-link', authenticateToken, async (req, res) => {
    try {
        const stripeClient = getStripe()
        if (!stripeClient) return res.status(503).json({ message: 'Stripe not configured' })

        const user = await getUser(req.user.id)
        if (!user) return res.status(404).json({ message: 'User not found' })

        let accountId = user.stripeAccountId
        if (!accountId) {
            // Create a new Express account
            const account = await stripeClient.accounts.create({
                type: 'express',
                email: user.email,
                metadata: { userId: user.id }
            })
            accountId = account.id
            await updateUser(user.id, { stripeAccountId: accountId })
        }

        const accountLink = await stripeClient.accountLinks.create({
            account: accountId,
            refresh_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/onboarding-refresh`,
            return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/wallet?onboarding=success`,
            type: 'account_onboarding',
        })

        res.json({ url: accountLink.url })
    } catch (err) {
        console.error('Onboarding link error:', err)
        const message = err.message?.includes('signed up for Connect')
            ? 'Stripe Connect is not enabled on this account. Please enable it in the Stripe Dashboard.'
            : 'Failed to create onboarding link'
        res.status(500).json({ message })
    }
})

// Onboarding refresh
router.get('/onboarding-refresh', authenticateToken, async (req, res) => {
    // Just redirect back to the onboarding link generation
    res.redirect('/api/wallet/onboarding-link')
})

// Create deposit payment intent
router.post('/deposit', authenticateToken, async (req, res) => {
    try {
        const stripeClient = getStripe()

        if (!stripeClient) {
            return res.status(503).json({
                message: 'Stripe not configured. Use /api/wallet/deposit-test for development.',
                useTestEndpoint: true
            })
        }

        const { amount } = req.body

        if (!amount || amount < 1) {
            return res.status(400).json({ message: 'Minimum deposit is $1' })
        }

        // Create Stripe payment intent
        const paymentIntent = await stripeClient.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                userId: req.user.id,
                type: 'deposit'
            }
        })

        res.json({
            clientSecret: paymentIntent.client_secret
        })
    } catch (err) {
        console.error('Create deposit error:', err)
        res.status(500).json({ message: 'Failed to create payment. Use /api/wallet/deposit-test for development.' })
    }
})

// Stripe webhook (for confirming payments and account updates)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const stripeClient = getStripe()
    if (!stripeClient) {
        return res.status(503).json({ message: 'Stripe not configured' })
    }

    const sig = req.headers['stripe-signature']
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event

    try {
        event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret)
    } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object
            const userId = paymentIntent.metadata.userId
            const amount = paymentIntent.amount / 100 // Convert from cents

            // Update user balance
            const user = await getUser(userId)
            if (user) {
                await updateUser(userId, {
                    balance: user.balance + amount
                })

                // Record transaction
                await addTransaction({
                    id: uuidv4(),
                    userId,
                    type: 'deposit',
                    amount,
                    stripePaymentId: paymentIntent.id,
                    createdAt: new Date().toISOString()
                })
            }
            break

        case 'account.updated':
            const account = event.data.object
            // Check if onboarding is complete
            if (account.details_submitted && account.payouts_enabled) {
                const userAccount = await getUserByStripeAccountId(account.id)
                if (userAccount) {
                    await updateUser(userAccount.id, { stripeOnboardingComplete: true })
                    console.log(`Onboarding complete for user ${userAccount.id}`)
                }
            }
            break

        default:
            console.log(`Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
})

// Get transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await getTransactions(req.user.id)
        res.json({ transactions })
    } catch (err) {
        console.error('Get transactions error:', err)
        res.status(500).json({ message: 'Server error' })
    }
})

// Simulate deposit (for testing without Stripe)
router.post('/deposit-test', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body

        if (!amount || amount < 1) {
            return res.status(400).json({ message: 'Minimum deposit is $1' })
        }

        const user = await getUser(req.user.id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        // Update balance directly (for testing)
        await updateUser(req.user.id, {
            balance: user.balance + amount
        })

        // Record transaction
        await addTransaction({
            id: uuidv4(),
            userId: req.user.id,
            type: 'deposit',
            amount,
            stripePaymentId: 'test_' + uuidv4(),
            createdAt: new Date().toISOString()
        })

        res.json({
            success: true,
            newBalance: user.balance + amount,
            message: `Added $${amount} to your balance (test mode)`
        })
    } catch (err) {
        console.error('Test deposit error:', err)
        res.status(500).json({ message: 'Server error' })
    }
})

// Manually confirm deposit (to handle cases where webhooks fail or are delayed, e.g. localhost)
router.post('/confirm-deposit', authenticateToken, async (req, res) => {
    try {
        const { paymentIntentId } = req.body
        if (!paymentIntentId) return res.status(400).json({ message: 'Payment Intent ID required' })

        const stripeClient = getStripe()
        if (!stripeClient) return res.status(503).json({ message: 'Stripe not configured' })

        // 1. Retrieve PaymentIntent from Stripe
        const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId)

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ message: 'Payment not successful' })
        }

        // 2. Verify ownership
        if (paymentIntent.metadata.userId !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' })
        }

        // 3. Check if already processed to prevent double-counting
        const transactions = await getTransactions(req.user.id)
        const existing = transactions.find(t => t.stripePaymentId === paymentIntent.id)

        if (existing) {
            return res.json({ success: true, message: 'Already processed', newBalance: 0 })
        }

        // 4. Process update
        const amount = paymentIntent.amount / 100 // Convert from cents
        const user = await getUser(req.user.id)

        if (user) {
            await updateUser(req.user.id, {
                balance: user.balance + amount
            })

            await addTransaction({
                id: uuidv4(),
                userId: req.user.id,
                type: 'deposit',
                amount,
                stripePaymentId: paymentIntent.id,
                createdAt: new Date().toISOString()
            })

            return res.json({ success: true, newBalance: user.balance + amount })
        }

        res.status(404).json({ message: 'User not found' })

    } catch (err) {
        console.error('Confirm deposit error:', err)
        res.status(500).json({ message: 'Confirmation failed' })
    }
})

// Withdraw funds (Automated via Stripe Connect)
router.post('/withdraw', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body
        const withdrawalAmount = parseFloat(amount)

        if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            return res.status(400).json({ message: 'Invalid withdrawal amount' })
        }

        const MIN_WITHDRAWAL = 1.00
        if (withdrawalAmount < MIN_WITHDRAWAL) {
            return res.status(400).json({ message: `Minimum withdrawal is $${MIN_WITHDRAWAL.toFixed(2)}` })
        }

        const stripeClient = getStripe()
        if (!stripeClient) {
            return res.status(503).json({ message: 'Stripe not configured' })
        }

        const user = await getUser(req.user.id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        if (user.balance < withdrawalAmount) {
            return res.status(400).json({ message: 'Insufficient balance' })
        }

        if (!user.stripeOnboardingComplete) {
            return res.status(400).json({ message: 'Please set up your bank details via Stripe first.' })
        }

        // 1. Deduct balance
        const newBalance = user.balance - withdrawalAmount
        await updateUser(req.user.id, {
            balance: newBalance
        })

        // 2. Create Stripe Transfer to the connected account
        // Note: In real production, you need to ensure you have enough balance in your own Stripe account
        const transfer = await stripeClient.transfers.create({
            amount: Math.round(withdrawalAmount * 100), // cents
            currency: 'usd',
            destination: user.stripeAccountId,
            metadata: {
                userId: req.user.id,
                type: 'withdrawal'
            }
        })

        // 3. Add transaction record
        await addTransaction({
            id: uuidv4(),
            userId: req.user.id,
            type: 'withdrawal',
            amount: -withdrawalAmount,
            status: 'completed',
            stripeTransferId: transfer.id,
            createdAt: new Date().toISOString()
        })

        res.json({
            success: true,
            message: 'Withdrawal processed successfully! Funds are on their way to your bank.',
            newBalance
        })

    } catch (err) {
        console.error('Withdrawal error:', err)
        res.status(500).json({ message: err.message || 'Failed to process withdrawal' })
    }
})

export default router
