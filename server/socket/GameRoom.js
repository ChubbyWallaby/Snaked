
const WORLD_SIZE = 4000
const FOOD_COUNT = 300
const FOOD_RADIUS = 8
const SEGMENT_RADIUS = 12
const GAME_FEE = parseFloat(process.env.GAME_FEE) || 0.5
const INITIAL_SNAKE_LENGTH = 10

// Game colors
const SNAKE_COLORS = [
    '#00ff88', '#ff00aa', '#00d4ff', '#ffd700', '#ff6600',
    '#9933ff', '#00ffcc', '#ff3366', '#66ff33', '#ff9900'
]

export class GameRoom {
    constructor(roomId, io) {
        this.roomId = roomId
        this.io = io
        this.players = new Map() // Map<socketId, player>
        this.food = []
        this.moneyOrbs = []
        this.lastUpdate = Date.now()
        this.intervalId = null
        this.active = false

        this.initFood()
    }

    initFood() {
        this.food = []
        this.foodIdCounter = 0 // Stable incrementing ID
        for (let i = 0; i < FOOD_COUNT; i++) {
            this.spawnFood()
        }
    }

    spawnFood() {
        this.food.push({
            id: `food_${this.foodIdCounter++}`, // Stable incrementing ID
            x: Math.random() * (WORLD_SIZE - 100) + 50,
            y: Math.random() * (WORLD_SIZE - 100) + 50,
            color: SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)]
        })
    }

    isSpawnCollision(x, y) {
        const SAFE_DISTANCE = 200 // Minimum distance from other snakes
        for (const player of this.players.values()) {
            for (const segment of player.segments) {
                const dx = x - segment.x
                const dy = y - segment.y
                if (dx * dx + dy * dy < SAFE_DISTANCE * SAFE_DISTANCE) {
                    return true
                }
            }
        }
        return false
    }

    createSnake(playerId, userId, username) {
        let attempts = 0
        let startX, startY

        // Find a safe spawn location
        do {
            startX = WORLD_SIZE / 2 + (Math.random() - 0.5) * 2000
            startY = WORLD_SIZE / 2 + (Math.random() - 0.5) * 2000
            attempts++
        } while (this.isSpawnCollision(startX, startY) && attempts < 20)

        if (attempts >= 20) {
            console.log(`Warning: Could not find safe spawn for ${username} after 20 attempts`)
        }

        const colorIndex = Math.floor(Math.random() * SNAKE_COLORS.length)

        const segments = []
        for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
            segments.push({
                x: startX - i * 10,
                y: startY
            })
        }

        return {
            id: playerId,
            userId,
            username,
            segments,
            direction: { x: 1, y: 0 },
            color: SNAKE_COLORS[colorIndex],
            colorIndex,
            money: GAME_FEE, // Initial value = Entry Fee
            alive: true,
            joinedAt: Date.now()
        }
    }

    addPlayer(socketId, userId, username) {


        const player = this.createSnake(socketId, userId, username)
        this.players.set(socketId, player)

        // Broadcast join
        this.io.to(this.roomId).emit('playerJoined', {
            id: socketId,
            username,
            segments: player.segments,
            color: player.color
        })

        return player
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId)
        if (player) {
            // If alive when disconnecting, treat as death (drop orbs)
            if (player.alive) {
                this.handlePlayerDeath(player, null, true)
            }
            this.players.delete(socketId)
            this.io.to(this.roomId).emit('playerLeft', socketId)
        }

        // If room empty, stop? (Managed by LobbyManager usually)
    }

    handleMove(socketId, data) {
        const player = this.players.get(socketId)
        if (!player || !player.alive) return

        // Update direction
        if (data.direction) {
            player.direction = data.direction
        }

        // Update segments (trust client sync for now)
        if (data.segments && data.segments.length > 0) {
            player.segments = data.segments
        }

        // Check Collisions and Collection
        this.checkFoodCollection(player)
        this.checkMoneyCollection(socketId, player)

        const killerId = this.checkSnakeCollision(player)
        if (killerId) {
            this.handlePlayerDeath(player, killerId)
        } else {
            // Broadcast move
            this.io.to(this.roomId).emit('playerMoved', {
                id: socketId,
                segments: player.segments.slice(0, 20), // Bandwidth optimization
                direction: player.direction
            })
        }
    }

    handlePlayerDeath(player, killerId, disconnected = false) {
        player.alive = false

        // Drop money orbs
        const orbs = this.dropMoneyOrbs(player)
        this.moneyOrbs.push(...orbs)

        this.io.to(this.roomId).emit('playerDied', {
            playerId: player.id,
            killedBy: killerId,
            moneyOrbs: orbs,
            disconnected
        })

        // Remove player from Map after brief delay (allows death animation)
        setTimeout(() => {
            this.players.delete(player.id)
        }, 2000)
    }

    pointInCircle(px, py, cx, cy, radius) {
        const dx = px - cx
        const dy = py - cy
        return dx * dx + dy * dy <= radius * radius
    }

    checkSnakeCollision(player) {
        if (!player.alive || player.segments.length === 0) return null
        const head = player.segments[0]

        for (const [otherId, other] of this.players) {
            if (otherId === player.id || !other.alive) continue

            // Body collision
            for (let i = 1; i < other.segments.length; i++) {
                const segment = other.segments[i]
                if (this.pointInCircle(head.x, head.y, segment.x, segment.y, SEGMENT_RADIUS * 1.5)) {
                    return otherId // Killed by otherId
                }
            }

            // Head collision
            const otherHead = other.segments[0]
            if (this.pointInCircle(head.x, head.y, otherHead.x, otherHead.y, SEGMENT_RADIUS * 1.5)) {
                if (player.segments.length <= other.segments.length) {
                    return otherId // Killed by otherId
                }
            }
        }
        return null
    }

    checkFoodCollection(player) {
        if (!player.alive || player.segments.length === 0) return

        const head = player.segments[0]
        const collected = []

        this.food = this.food.filter(f => {
            if (this.pointInCircle(head.x, head.y, f.x, f.y, SEGMENT_RADIUS + FOOD_RADIUS)) {
                collected.push(f)
                return false
            }
            return true
        })

        // Respawn food
        collected.forEach(() => this.spawnFood())
    }

    checkMoneyCollection(socketId, player) {
        if (!player.alive || player.segments.length === 0) return

        const head = player.segments[0]

        this.moneyOrbs = this.moneyOrbs.filter(orb => {
            if (this.pointInCircle(head.x, head.y, orb.x, orb.y, SEGMENT_RADIUS + 10 + orb.value * 2)) {
                player.money += orb.value
                this.io.to(this.roomId).emit('moneyCollected', {
                    playerId: socketId,
                    orbId: orb.id,
                    amount: orb.value
                })
                return false
            }
            return true
        })
    }

    dropMoneyOrbs(player) {
        const orbs = []
        // Don't drop infinite money, cap it reasonable or based on what they had
        // For now, let's say they drop what they collected + entry fee? 
        // Logic from original file:
        const orbCount = Math.min(20, Math.ceil(player.money / 0.001))
        const moneyPerOrb = player.money / orbCount // Distribute their wealth

        for (let i = 0; i < Math.min(orbCount, player.segments.length); i++) {
            const segment = player.segments[Math.min(i * 2, player.segments.length - 1)]
            orbs.push({
                id: Math.random().toString(36).substr(2, 9),
                x: segment.x + (Math.random() - 0.5) * 30,
                y: segment.y + (Math.random() - 0.5) * 30,
                value: moneyPerOrb
            })
        }
        return orbs
    }

    getLeaderboard() {
        return Array.from(this.players.values())
            .filter(p => p.alive)
            .sort((a, b) => b.segments.length - a.segments.length)
            .slice(0, 10)
            .map(p => ({
                id: p.id,
                username: p.username,
                length: p.segments.length
            }))
    }

    startGameLoop() {
        this.active = true
        this.intervalId = setInterval(() => {
            if (!this.active) return

            const playersObject = {}
            for (const [id, player] of this.players) {
                if (player.alive) {
                    playersObject[id] = {
                        id: player.id,
                        username: player.username,
                        segments: player.segments,
                        color: player.color,
                        alive: player.alive // Include for client-side safety check
                    }
                }
            }

            this.io.to(this.roomId).emit('gameState', {
                players: playersObject,
                food: this.food,
                moneyOrbs: this.moneyOrbs,
                leaderboard: this.getLeaderboard(),
                playerCount: this.players.size
            })
        }, 100)
    }

    stop() {
        this.active = false
        if (this.intervalId) {
            clearInterval(this.intervalId)
        }
    }
}
