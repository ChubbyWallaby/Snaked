
import { v4 as uuidv4 } from 'uuid'
import { GameRoom } from './GameRoom.js'
import { updateUser, addTransaction, getUser } from '../db/index.js'

const MAX_PLAYERS = 50
const LOBBY_TIMER_SECONDS = 5
const GAME_FEE = parseFloat(process.env.GAME_FEE) || 0.5

const PENDING_FEE_KEY = 'pendingFees'

export class LobbyManager {
    constructor(io) {
        this.io = io
        this.waitingPlayers = new Map() // socketId -> { socket, user }
        this.timer = null
        this.timeLeft = LOBBY_TIMER_SECONDS
        this.activeGames = new Map() // roomId -> GameRoom
        this.socketRoomMap = new Map() // socketId -> roomId
    }

    // --- Socket Handling ---

    handleConnection(socket, user) {
        // Player connects, they are NOT in a game yet.
        // They must emit 'joinLobby' to enter the queue.

        socket.on('joinLobby', () => {
            this.addPlayerToLobby(socket, user)
        })

        socket.on('leaveLobby', () => {
            this.removePlayerFromLobby(socket.id)
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
        // Check if in lobby
        if (this.waitingPlayers.has(socketId)) {
            this.removePlayerFromLobby(socketId)
        }

        // Check if in game
        const roomId = this.socketRoomMap.get(socketId)
        if (roomId) {
            const room = this.activeGames.get(roomId)
            if (room) {
                room.removePlayer(socketId)
                this.socketRoomMap.delete(socketId)

                // Cleanup empty rooms? 
                // For now, let games run until everyone dies or leaves
                if (room.players.size === 0) {
                    room.stop()
                    this.activeGames.delete(roomId)
                    console.log(`Room ${roomId} cleaned up`)
                }
            }
        }
    }

    // --- Lobby Logic ---

    async addPlayerToLobby(socket, user) {
        // Prevent double join
        if (this.waitingPlayers.has(socket.id) || this.socketRoomMap.has(socket.id)) {
            return
        }

        // Check Balance accounting for pending fees
        const freshUser = await getUser(user.id)
        if (!freshUser) return

        const pending = freshUser[PENDING_FEE_KEY] || 0
        if (freshUser.balance - pending < GAME_FEE) {
            socket.emit('error', { message: 'Insufficient balance (funds may be reserved in another lobby)' })
            return
        }

        // Reserve funds
        await updateUser(user.id, {
            [PENDING_FEE_KEY]: pending + GAME_FEE
        })

        console.log(`Player ${user.username} joined lobby (Reserved $${GAME_FEE})`)

        this.waitingPlayers.set(socket.id, { socket, user: freshUser })
        socket.join('lobby')

        // Start timer if first player
        if (this.waitingPlayers.size === 1) {
            this.startTimer()
        }

        // Check cap
        if (this.waitingPlayers.size >= MAX_PLAYERS) {
            this.startGame()
        } else {
            this.broadcastLobbyState()
        }
    }

    async removePlayerFromLobby(socketId) {
        if (this.waitingPlayers.has(socketId)) {
            const { socket, user } = this.waitingPlayers.get(socketId)

            // Release reserved funds
            const freshUser = await getUser(user.id)
            if (freshUser) {
                const pending = freshUser[PENDING_FEE_KEY] || 0
                await updateUser(user.id, {
                    [PENDING_FEE_KEY]: Math.max(0, pending - GAME_FEE)
                })
                console.log(`Released reservation of $${GAME_FEE} for ${user.username}`)
            }

            socket.leave('lobby')
            this.waitingPlayers.delete(socketId)

            console.log(`Player ${user.username} left lobby`)

            // Stop timer if empty or only 1 player
            if (this.waitingPlayers.size === 0) {
                this.stopTimer()
            } else if (this.waitingPlayers.size === 1 && this.timer) {
                // Reset timer if only 1 player left
                this.stopTimer()
                this.startTimer()
            }

            this.broadcastLobbyState()
        }
    }


    startTimer() {
        if (this.timer) clearInterval(this.timer)
        this.timeLeft = LOBBY_TIMER_SECONDS

        this.timer = setInterval(() => {
            this.timeLeft--
            this.broadcastLobbyState()

            if (this.timeLeft <= 0) {
                if (this.waitingPlayers.size >= 2) {
                    this.startGame()
                } else {
                    // Reset if not enough players
                    this.timeLeft = LOBBY_TIMER_SECONDS
                }
            }
        }, 1000)
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }
        this.timeLeft = LOBBY_TIMER_SECONDS
    }

    broadcastLobbyState() {
        this.io.to('lobby').emit('lobbyUpdate', {
            players: this.waitingPlayers.size,
            maxPlayers: MAX_PLAYERS,
            timeLeft: this.timeLeft
        })
    }

    // --- Game Creation ---

    async deductFee(userId) {
        try {
            const user = await getUser(userId)
            if (!user) return false

            // We already checked balance at entry, but double check
            // Also we need to clear the pending fee and deduct real balance

            const pending = user[PENDING_FEE_KEY] || 0
            const newPending = Math.max(0, pending - GAME_FEE)
            const newBalance = user.balance - GAME_FEE

            if (newBalance < 0) {
                // Should not happen if reservation worked, unless race condition or bug
                console.error(`CRITICAL: User ${userId} negative balance after fee deduction!`)
                return false
            }

            await updateUser(userId, {
                balance: newBalance,
                [PENDING_FEE_KEY]: newPending
            })

            await addTransaction({
                id: uuidv4(),
                userId: userId,
                type: 'game_fee',
                amount: -GAME_FEE,
                description: 'Game entry fee',
                createdAt: new Date().toISOString()
            })

            console.log(`Deducted $${GAME_FEE} from user ${userId}`)
            return true
        } catch (err) {
            console.error('Fee deduction error:', err)
            return false
        }
    }

    async startGame() {
        this.stopTimer()

        if (this.waitingPlayers.size === 0) return

        const roomId = uuidv4()
        const room = new GameRoom(roomId, this.io)

        console.log(`Starting Game ${roomId} with ${this.waitingPlayers.size} players`)

        // Deduct fees and move players from Lobby to Game
        const playersToAdd = []

        // Create a snapshot of waiting players to iterate
        // Use Array.from to avoid issues if map changes (though it shouldn't here)
        const lobbyPlayers = Array.from(this.waitingPlayers.entries())

        for (const [socketId, { socket, user }] of lobbyPlayers) {
            // Deduct fee now that game is actually starting
            const success = await this.deductFee(user.id)

            if (success) {
                playersToAdd.push({ socketId, socket, user })
            } else {
                // Kick player who can't pay (rare edge case)
                socket.emit('error', { message: 'Insufficient balance to start game' })
                socket.leave('lobby')

                // Also ensure we remove them from waitingPlayers so they don't get stuck
                // (Though we clear the map below anyway)
            }
        }

        // If everyone failed to pay somehow, abort
        if (playersToAdd.length === 0) {
            console.log('No players could pay - game aborted')
            this.waitingPlayers.clear()
            return
        }

        // Add paying players to game
        for (const { socketId, socket, user } of playersToAdd) {
            socket.leave('lobby')
            socket.join(roomId)

            this.socketRoomMap.set(socketId, roomId)
            const player = room.addPlayer(socketId, user.id, user.username)

            // Notify client game is starting with their snake details
            socket.emit('gameStart', {
                roomId,
                player: {
                    id: player.id,
                    segments: player.segments,
                    color: player.color
                }
            })
        }

        // Clear lobby
        this.waitingPlayers.clear()

        // Start game loop
        room.startGameLoop()
        this.activeGames.set(roomId, room)
    }
}
