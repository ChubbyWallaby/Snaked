import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { JWT_SECRET } from '../middleware/auth.js'
import { getUser, getUserByEmail, createUser, updateUser } from '../db/index.js'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, username } = req.body

        // Validation
        if (!email || !password || !username) {
            return res.status(400).json({ message: 'All fields are required' })
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' })
        }

        if (username.length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters' })
        }

        // Check if user exists
        const existingUser = await getUserByEmail(email)
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' })
        }

        // Hash password
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)

        // Create user
        const userId = uuidv4()
        const user = await createUser({
            id: userId,
            email,
            username,
            passwordHash,
            balance: 0,
            gamesPlayed: 0,
            totalEarnings: 0,
            survivalRate: 0,
            createdAt: new Date().toISOString()
        })

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                balance: user.balance,
                gamesPlayed: user.gamesPlayed,
                totalEarnings: user.totalEarnings,
                survivalRate: user.survivalRate,
                role: user.role,
                stripeAccountId: user.stripeAccountId,
                stripeOnboardingComplete: user.stripeOnboardingComplete
            }
        })
    } catch (err) {
        console.error('Register error:', err)
        res.status(500).json({ message: 'Server error' })
    }
})

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' })
        }

        // Find user
        const user = await getUserByEmail(email)
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' })
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.passwordHash)
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' })
        }

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                balance: user.balance,
                gamesPlayed: user.gamesPlayed,
                totalEarnings: user.totalEarnings,
                survivalRate: user.survivalRate,
                role: user.role,
                stripeAccountId: user.stripeAccountId,
                stripeOnboardingComplete: user.stripeOnboardingComplete
            }
        })
    } catch (err) {
        console.error('Login error:', err)
        res.status(500).json({ message: 'Server error' })
    }
})

// Get current user
router.get('/me', async (req, res) => {
    try {
        // Verify token from header
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]

        if (!token) {
            return res.status(401).json({ message: 'No token provided' })
        }

        const decoded = jwt.verify(token, JWT_SECRET)
        const user = await getUser(decoded.id)

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                balance: user.balance,
                gamesPlayed: user.gamesPlayed,
                totalEarnings: user.totalEarnings,
                survivalRate: user.survivalRate,
                role: user.role,
                stripeAccountId: user.stripeAccountId,
                stripeOnboardingComplete: user.stripeOnboardingComplete
            }
        })
    } catch (err) {
        console.error('Get user error:', err)
        res.status(401).json({ message: 'Invalid token' })
    }
})

export default router
