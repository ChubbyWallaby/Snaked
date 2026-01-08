import jwt from 'jsonwebtoken'
import { auth as firebaseAuth } from '../firebase.js'

// JWT Secret (for fallback/legacy support)
export const JWT_SECRET = process.env.JWT_SECRET || 'snaked-super-secret-key-change-in-production'

// Firebase token verification middleware
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' })
    }

    try {
        // Try Firebase token verification first
        const decodedFirebase = await firebaseAuth.verifyIdToken(token)
        req.user = {
            id: decodedFirebase.uid,
            email: decodedFirebase.email,
            username: decodedFirebase.name || decodedFirebase.email?.split('@')[0],
            firebaseUser: true
        }
        return next()
    } catch (firebaseErr) {
        // Fall back to JWT verification for legacy tokens
        try {
            const user = jwt.verify(token, JWT_SECRET)
            req.user = user
            return next()
        } catch (jwtErr) {
            return res.status(403).json({ message: 'Invalid token' })
        }
    }
}

// Firebase-only verification (for new endpoints)
export const authenticateFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' })
    }

    try {
        const decoded = await firebaseAuth.verifyIdToken(token)
        req.user = {
            id: decoded.uid,
            email: decoded.email,
            username: decoded.name || decoded.email?.split('@')[0],
            firebaseUser: true
        }
        next()
    } catch (err) {
        return res.status(403).json({ message: 'Invalid Firebase token' })
    }
}
