import jwt from 'jsonwebtoken'
import { LobbyManager } from './LobbyManager.js'

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
                const decoded = jwt.verify(token, JWT_SECRET)
                userId = decoded.id
                username = decoded.username
            } catch (err) {
                console.log('Invalid token, using anonymous')
            }
        }

        const user = { id: userId, username }

        // Delegate to LobbyManager
        lobbyManager.handleConnection(socket, user)
    })

    console.log('🎮 Game socket initialized (Lobby System)')
}
