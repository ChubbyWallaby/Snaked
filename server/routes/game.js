import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authenticateToken } from '../middleware/auth.js'
import { getUser, updateUser, addTransaction, addGameSession } from '../db/index.js'

const router = express.Router()

const GAME_FEE = parseFloat(process.env.GAME_FEE) || 0.5
const MIN_PLAY_TIME_MINUTES = parseInt(process.env.MIN_PLAY_TIME_MINUTES) || 10

// Join game (check balance - fee deducted when game actually starts)
router.post('/join', authenticateToken, async (req, res) => {
    try {
        const user = await getUser(req.user.id)

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        if (user.balance < GAME_FEE) {
            return res.status(400).json({
                message: `Insufficient balance. Need $${GAME_FEE.toFixed(2)} to play.`
            })
        }

        // Create game session (fee will be deducted when game starts)
        const sessionId = uuidv4()
        await addGameSession({
            id: sessionId,
            userId: req.user.id,
            startedAt: new Date().toISOString(),
            entryFee: GAME_FEE,
            moneyCollected: 0,
            moneyLost: 0,
            feeDeducted: false // Track if fee was actually charged
        })

        res.json({
            success: true,
            sessionId,
            balance: user.balance, // Return current balance (unchanged)
            entryFee: GAME_FEE
        })
    } catch (err) {
        console.error('Join game error:', err)
        res.status(500).json({ message: 'Failed to join game' })
    }
})

// End game (process earnings)
router.post('/end', authenticateToken, async (req, res) => {
    try {
        const { earnings, survived, sessionId } = req.body
        const user = await getUser(req.user.id)

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        // Add earnings to balance
        if (earnings && earnings > 0) {
            const newBalance = user.balance + earnings
            await updateUser(req.user.id, {
                balance: newBalance,
                gamesPlayed: (user.gamesPlayed || 0) + 1,
                totalEarnings: (user.totalEarnings || 0) + earnings
            })

            // Record earnings transaction
            await addTransaction({
                id: uuidv4(),
                userId: req.user.id,
                type: 'earnings',
                amount: earnings,
                createdAt: new Date().toISOString()
            })

            res.json({
                success: true,
                earnings,
                newBalance
            })
        } else {
            // Player died before 10 min or no earnings
            await updateUser(req.user.id, {
                gamesPlayed: (user.gamesPlayed || 0) + 1
            })

            res.json({
                success: true,
                earnings: 0,
                newBalance: user.balance
            })
        }
    } catch (err) {
        console.error('End game error:', err)
        res.status(500).json({ message: 'Failed to end game' })
    }
})

// Get player stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const user = await getUser(req.user.id)

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.json({
            gamesPlayed: user.gamesPlayed || 0,
            totalEarnings: user.totalEarnings || 0,
            survivalRate: user.survivalRate || 0
        })
    } catch (err) {
        console.error('Get stats error:', err)
        res.status(500).json({ message: 'Server error' })
    }
})

export default router
