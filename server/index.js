import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import walletRoutes from './routes/wallet.js'
import gameRoutes from './routes/game.js'
import adminRoutes from './routes/admin.js'
import { setupGameSocket } from './socket/gameHandler.js'
import { initDatabase } from './db/index.js'

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
})

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/game', gameRoutes)
app.use('/api/admin', adminRoutes)

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Root endpoint
app.get('/', (req, res) => {
    res.send('🐍 Snaked! API Server is running. Frontend is at <a href="' + (process.env.CLIENT_URL || 'http://localhost:5173') + '">http://localhost:5173</a>')
})

// Initialize socket handlers
setupGameSocket(io)

// Start server
const PORT = process.env.PORT || 3001

async function start() {
    try {
        await initDatabase()

        console.log('Stripe Key Configured:', process.env.STRIPE_SECRET_KEY ? 'YES (' + process.env.STRIPE_SECRET_KEY.substring(0, 8) + '...)' : 'NO')

        server.listen(PORT, () => {
            console.log(`🐍 Snaked! server running on port ${PORT}`)
            console.log(`   API: http://localhost:${PORT}/api`)
        })
    } catch (err) {
        console.error('Failed to start server:', err)
        process.exit(1)
    }
}

start()
