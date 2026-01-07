
import { v4 as uuidv4 } from 'uuid'
import { GameRoom } from './GameRoom.js'

const MAX_PLAYERS = 50

export class LobbyManager {
    constructor(io) {
        this.io = io
        this.activeGames = new Map() // roomId -> GameRoom
        this.socketRoomMap = new Map() // socketId -> roomId
    }

    // --- Socket Handling ---

    handleConnection(socket, user) {
        // Player connects and can immediately join a game by watching an ad
        socket.on('joinGame', (data) => {
            this.handleJoinGame(socket, user, data)
        })

        socket.on('disconnect', () => {
            this.handleDisconnect(socket.id)
        })

        // Game Events Proxy
        socket.on('move', (data) => {
            const roomId = this.socketRoomMap.get(socket.id)
            if (roomId) {
                const room = this.activeGames.get(roomId)
                if (room) {
                    room.handleMove(socket.id, data)
                }
            }
        })
    }

    handleDisconnect(socketId) {
        // Check if in game
        const roomId = this.socketRoomMap.get(socketId)
        if (roomId) {
            const room = this.activeGames.get(roomId)
            if (room) {
                room.removePlayer(socketId)
                this.socketRoomMap.delete(socketId)

                // Cleanup empty rooms
                if (room.players.size === 0) {
                    room.stop()
                    this.activeGames.delete(roomId)
                    console.log(`Room ${roomId} cleaned up`)
                }
            }
        }
    }

    // --- Instant Join Logic ---

    findOrCreateRoom() {
        // Find existing room with < MAX_PLAYERS
        for (const [id, room] of this.activeGames) {
            if (room.players.size < MAX_PLAYERS) {
                return { roomId: id, room }
            }
        }

        // Create new room if all are full
        const roomId = uuidv4()
        const room = new GameRoom(roomId, this.io)
        this.activeGames.set(roomId, room)
        room.startGameLoop()
        console.log(`Created new room ${roomId} `)
        return { roomId, room }
    }

    // --- Ad-Based Join Logic ---

    async handleJoinGame(socket, user, data) {
        // Prevent double join
        if (this.socketRoomMap.has(socket.id)) {
            console.log(`Player ${user.username} already in a game`)
            return
        }

        const { adRevenue } = data

        // Validate ad revenue is reasonable (€0.001 - €0.05)
        if (!adRevenue || adRevenue < 0.001 || adRevenue > 0.05) {
            socket.emit('error', { message: 'Invalid ad revenue' })
            console.log(`Invalid ad revenue from ${user.username}: ${adRevenue}`)
            return
        }

        console.log(`Player ${user.username} watched ad. Revenue: €${adRevenue.toFixed(4)} (${Math.round(adRevenue * 10000)} points)`)

        // Find or create a room
        const { roomId, room } = this.findOrCreateRoom()

        // Spawn points orbs from ad revenue
        const points = Math.round(adRevenue * 10000)
        room.spawnPointsOrbs(points)

        // Add player to room
        socket.join(roomId)
        this.socketRoomMap.set(socket.id, roomId)
        const player = room.addPlayer(socket.id, user.id, user.username)

        // Notify client game is starting with their snake details
        socket.emit('gameStart', {
            roomId,
            player: {
                id: player.id,
                segments: player.segments,
                color: player.color
            }
        })

        console.log(`Player ${user.username} joined room ${roomId.slice(0, 8)} (${room.players.size}/${MAX_PLAYERS})`)
    }
}
