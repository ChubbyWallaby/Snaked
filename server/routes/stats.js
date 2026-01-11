import express from 'express'
import { lobbyManager } from '../socket/gameHandler.js'

const router = express.Router()

// GET /api/stats/prize-pool
// Returns the total number of points in play across all game rooms
router.get('/prize-pool', (req, res) => {
    try {
        // Check if lobby manager is initialized
        if (!lobbyManager) {
            return res.json({ totalPoints: 0 })
        }

        const totalPoints = lobbyManager.getTotalPoints()

        res.json({ totalPoints })
    } catch (error) {
        console.error('Error fetching prize pool:', error)
        res.status(500).json({ error: 'Failed to fetch prize pool' })
    }
})

export default router
