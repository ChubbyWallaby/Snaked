import jwt from 'jsonwebtoken'

// JWT Secret
export const JWT_SECRET = process.env.JWT_SECRET || 'snaked-super-secret-key-change-in-production'

// Auth middleware
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' })
    }

    try {
        const user = jwt.verify(token, JWT_SECRET)
        req.user = user
        next()
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' })
    }
}
