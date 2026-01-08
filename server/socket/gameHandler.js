import jwt from 'jsonwebtoken'
import { LobbyManager } from './LobbyManager.js'
import { auth as firebaseAuth } from '../firebase.js'
import { getUser } from '../db/index.js'

let lobbyManager = null

export function setupGameSocket(io) {
    const JWT_SECRET = process.env.JWT_SECRET || 'snaked-super-secret-key-change-in-production'

    lobbyManager = new LobbyManager(io)

    io.on('connection', async (socket) => {
        console.log(`Socket connected: ${socket.id}`)

        // Authenticate
        const token = socket.handshake.auth.token
        let userId = null
        let username = 'Player'

        if (token) {
            try {
                // Try Legacy JWT first
                const decoded = jwt.verify(token, JWT_SECRET)
                userId = decoded.id
                username = decoded.username
            } catch (jwtErr) {
                // Try Firebase Token
                try {
                    const decodedToken = await firebaseAuth.verifyIdToken(token)
                    userId = decodedToken.uid
                    // Fetch full user from DB to get correct username
                    const user = await getUser(userId)
                    if (user) {
                        username = user.username
                    } else {
                        // Fallback to display name or email part
                        username = decodedToken.name || decodedToken.email?.split('@')[0] || 'Player'
                    }
                } catch (fbErr) {
                    console.log('Invalid token (JWT & Firebase), using anonymous')
                }
            }
        }

        const user = { id: userId, username }

        // Delegate to LobbyManager
        lobbyManager.handleConnection(socket, user)
    })

    console.log('🎮 Game socket initialized (Lobby System)')
}
