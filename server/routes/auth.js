import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { JWT_SECRET, authenticateFirebaseToken } from '../middleware/auth.js'
import { geoBlockMiddleware, getClientIp } from '../middleware/geoBlock.js'
import { getUser, getUserByEmail, createUser, updateUser } from '../db/index.js'
import { auth as firebaseAuth } from '../firebase.js'

const router = express.Router()

// Firebase authentication - handles both email/password and Google sign-in
router.post('/firebase', geoBlockMiddleware, async (req, res) => {
    try {
        const { idToken } = req.body

        if (!idToken) {
            return res.status(400).json({ message: 'Firebase ID token required' })
        }

        // Verify Firebase token
        console.log('Verifying Firebase token...')
        const decodedToken = await firebaseAuth.verifyIdToken(idToken)
        console.log('Token verified for UID:', decodedToken.uid)

        const { uid, email, name, picture } = decodedToken

        // Check if user exists in our database
        console.log('Checking if user exists in Firestore...')
        let user = await getUser(uid)

        if (!user) {
            // Create new user from Firebase auth
            const now = new Date().toISOString()
            const registrationIp = getClientIp(req)
            const registrationIpHash = crypto.createHash('sha256').update(registrationIp).digest('hex')

            user = await createUser({
                id: uid,
                email,
                username: name || email?.split('@')[0] || 'User',
                photoURL: picture || null,
                balance: 0,
                gamesPlayed: 0,
                totalEarnings: 0,
                survivalRate: 0,
                ageVerified: true,
                ageVerifiedAt: now,
                termsAccepted: true,
                termsAcceptedAt: now,
                registrationCountry: req.geoLocation?.country || 'Unknown',
                registrationCountryCode: req.geoLocation?.countryCode || 'XX',
                registrationIpHash,
                authProvider: decodedToken.firebase?.sign_in_provider || 'firebase',
                createdAt: now
            })
        }

        // Return user data (client already has Firebase token)
        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                photoURL: user.photoURL,
                gamesPlayed: user.gamesPlayed,
                totalEarnings: user.totalEarnings,
                survivalRate: user.survivalRate,
                role: user.role
            }
        })
    } catch (err) {
        console.error('Firebase auth error:', err.message || err)
        console.error('Firebase auth error code:', err.code || 'unknown')
        console.error('Stack:', err.stack) // Log stack trace
        res.status(401).json({
            message: 'Invalid Firebase token',
            error: process.env.NODE_ENV !== 'production' ? err.message : undefined
        })
    }
})

// Password reset - uses Firebase Auth
router.post('/password-reset', async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ message: 'Email is required' })
        }

        // Note: The actual password reset email is sent from the client
        // This endpoint exists for any server-side validation needed
        const user = await getUserByEmail(email)

        // Always return success to prevent email enumeration
        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        })
    } catch (err) {
        console.error('Password reset error:', err)
        res.status(500).json({ message: 'Server error' })
    }
})

// Legacy Register (with geo-blocking) - kept for backwards compatibility
router.post('/register', geoBlockMiddleware, async (req, res) => {
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
        const now = new Date().toISOString()

        // Store registration location for compliance (hash IP for privacy)
        const registrationIp = getClientIp(req)
        const registrationIpHash = crypto.createHash('sha256').update(registrationIp).digest('hex')

        const user = await createUser({
            id: userId,
            email,
            username,
            passwordHash,
            balance: 0,
            gamesPlayed: 0,
            totalEarnings: 0,
            survivalRate: 0,
            ageVerified: true,
            ageVerifiedAt: now,
            termsAccepted: true,
            termsAcceptedAt: now,
            registrationCountry: req.geoLocation?.country || 'Unknown',
            registrationCountryCode: req.geoLocation?.countryCode || 'XX',
            registrationIpHash,
            authProvider: 'legacy',
            createdAt: now
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
                gamesPlayed: user.gamesPlayed,
                totalEarnings: user.totalEarnings,
                survivalRate: user.survivalRate,
                role: user.role
            }
        })
    } catch (err) {
        console.error('Register error:', err)
        res.status(500).json({ message: 'Server error' })
    }
})

// Legacy Login (with geo-blocking) - kept for backwards compatibility
router.post('/login', geoBlockMiddleware, async (req, res) => {
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
                gamesPlayed: user.gamesPlayed,
                totalEarnings: user.totalEarnings,
                survivalRate: user.survivalRate,
                role: user.role
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

        let userId

        // Try Firebase token first
        try {
            const decodedFirebase = await firebaseAuth.verifyIdToken(token)
            userId = decodedFirebase.uid
        } catch (firebaseErr) {
            // Fall back to JWT
            try {
                const decoded = jwt.verify(token, JWT_SECRET)
                userId = decoded.id
            } catch (jwtErr) {
                return res.status(401).json({ message: 'Invalid token' })
            }
        }

        const user = await getUser(userId)

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                photoURL: user.photoURL,
                gamesPlayed: user.gamesPlayed,
                totalEarnings: user.totalEarnings,
                survivalRate: user.survivalRate,
                role: user.role
            }
        })
    } catch (err) {
        console.error('Get user error:', err)
        res.status(401).json({ message: 'Invalid token' })
    }
})

export default router
