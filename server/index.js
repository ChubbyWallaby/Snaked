// Load environment variables FIRST - before any other imports
import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'

import authRoutes from './routes/auth.js'
import gameRoutes from './routes/game.js'
import adminRoutes from './routes/admin.js'
import statsRoutes from './routes/stats.js'
import { setupGameSocket } from './socket/gameHandler.js'
import { initDatabase } from './db/index.js'

const app = express()
const server = createServer(app)
const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'https://snaked.pages.dev' // Always allow main domain
]

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true)

            // Allow allowed origins and any Cloudflare preview URLs (*.pages.dev)
            if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.pages.dev')) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        },
        methods: ['GET', 'POST']
    }
})

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.pages.dev')) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true
}))
app.use(express.json())

// Trust proxy for IP detection (needed for Render, Cloudflare, etc.)
app.set('trust proxy', true)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/game', gameRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/stats', statsRoutes)

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
