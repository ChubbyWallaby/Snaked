
const WORLD_SIZE = 4000
const FOOD_COUNT = 300
const FOOD_RADIUS = 8
const SEGMENT_RADIUS = 12
const INITIAL_SNAKE_LENGTH = 10
const MAX_SPEED = 15 // Normal is ~5, boost is ~10. Allow buffer.

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
        this.foodChanged = true // Optimized broadcast flag
        this.moneyOrbs = []
        this.lastUpdate = Date.now()
        this.intervalId = null
        this.active = false
        this.cleanupTimeouts = new Set()

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
        this.foodChanged = true
    }

    /**
     * Spawn point orbs from ad revenue
     * Points are distributed randomly across the game world
     * @param {number} points - Total points to spawn (e.g., 100 for €0.01)
     */
    spawnPointsOrbs(points) {
        // Convert points to orbs (each orb = ~10 points for easier collection)
        const orbCount = Math.ceil(points / 10)
        const pointsPerOrb = Math.floor(points / orbCount)

        console.log(`Spawning ${orbCount} orbs with ${pointsPerOrb} points each (total: ${points} points)`)

        for (let i = 0; i < orbCount; i++) {
            this.moneyOrbs.push({
                id: Math.random().toString(36).substr(2, 9),
                x: Math.random() * (WORLD_SIZE - 100) + 50,
                y: Math.random() * (WORLD_SIZE - 100) + 50,
                value: pointsPerOrb // Store as direct points (integer)
            })
        }
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
            points: 0, // Store as points (integer)
            alive: true,
            joinedAt: Date.now(),
            lastMoveTime: Date.now()
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

        const now = Date.now()
        // Simple speed validation
        // We trust the client's segments (for now, to keep movement smooth on their end)
        // BUT we check if the head moved too far since last update

        if (data.segments && data.segments.length > 0) {
            // Note: Speed validation was causing issues because client spawn position
            // can differ from server spawn position, causing first move to be rejected.
            // For a production game, we'd need to:
            // 1. Make client use server-provided spawn position exactly
            // 2. Or implement server-authoritative movement
            // For now, trust client segments to keep game playable.

            player.segments = data.segments
            player.lastMoveTime = Date.now()
        }

        // Update direction
        if (data.direction) {
            player.direction = data.direction
        }

        // Check Collisions and Collection
        this.checkFoodCollection(player)
        this.checkMoneyCollection(socketId, player)

        const killerId = this.checkSnakeCollision(player)
        if (killerId) {
            this.handlePlayerDeath(player, killerId)
        } else {
            // Broadcast move
            // Optimization: Don't rebroadcast every single move immediately.
            // The gameloop will pick up the new state. 
            // However, for smooth opponent movement, we might want to emit key events.
            // But relying on the tick loop is more bandwidth efficient.
            // The original code emitted 'playerMoved' here. Let's keep it but maybe throttle?
            // Actually, let's REMOVE immediate broadcast and rely on the Game Loop tick (10Hz)
            // This massively reduces bandwidth.

            // this.io.to(this.roomId).emit('playerMoved', ...)
        }
    }

    handlePlayerDeath(player, killerId, disconnected = false) {
        player.alive = false

        // New death distribution: 50% local, 30% random, 20% lost
        const totalPoints = player.points
        const localDrop = Math.floor(totalPoints * 0.50)
        const randomDrop = Math.floor(totalPoints * 0.30)
        // 20% lost forever (economy sink)

        // Drop 50% at death location
        const localOrbs = this.dropMoneyOrbs(player, localDrop)
        this.moneyOrbs.push(...localOrbs)

        // Spawn 30% randomly across the map
        const randomOrbs = this.spawnOrbsRandom(randomDrop)
        this.moneyOrbs.push(...randomOrbs)

        const allOrbs = [...localOrbs, ...randomOrbs]

        this.io.to(this.roomId).emit('playerDied', {
            playerId: player.id,
            killedBy: killerId,
            moneyOrbs: allOrbs,
            disconnected
        })

        // Immediately remove dead player to prevent ghost snakes
        // The client handles death animation locally
        this.players.delete(player.id)
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
                // Strict hitbox: match visual radius (12px)
                if (this.pointInCircle(head.x, head.y, segment.x, segment.y, SEGMENT_RADIUS)) {
                    return otherId // Killed by otherId
                }
            }

            // Head collision (Head-to-Head)
            // Use tighter radius for head-to-head (0.9) to favor "cutting off" maneuvers.
            // If hitboxes are too big, a flanker might "hit the head" instead of passing it.
            const otherHead = other.segments[0]
            if (this.pointInCircle(head.x, head.y, otherHead.x, otherHead.y, SEGMENT_RADIUS * 0.9)) {
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

        if (this.food.length < FOOD_COUNT) {
            this.foodChanged = true
        }

        // Respawn food
        collected.forEach(() => this.spawnFood())
    }

    checkMoneyCollection(socketId, player) {
        if (!player.alive || player.segments.length === 0) return

        const head = player.segments[0]

        this.moneyOrbs = this.moneyOrbs.filter(orb => {
            // Adjust radius for larger values (logarithmic scaling)
            const orbRadius = 10 + Math.log10(Math.max(1, orb.value)) * 2
            if (this.pointInCircle(head.x, head.y, orb.x, orb.y, SEGMENT_RADIUS + orbRadius)) {
                player.points += orb.value
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

    dropMoneyOrbs(player, amount) {
        const orbs = []
        // Use provided amount or default to all player points
        const totalPoints = amount !== undefined ? amount : player.points

        if (totalPoints <= 0) return orbs

        // Create orbs at player's death location
        // Target ~10 points per orb minimum, max 20 orbs
        const orbCount = Math.min(20, Math.max(1, Math.floor(totalPoints / 10)))
        const pointsPerOrb = Math.floor(totalPoints / orbCount)

        for (let i = 0; i < Math.min(orbCount, player.segments.length); i++) {
            const segment = player.segments[Math.min(i * 2, player.segments.length - 1)]
            orbs.push({
                id: Math.random().toString(36).substr(2, 9),
                x: segment.x + (Math.random() - 0.5) * 30,
                y: segment.y + (Math.random() - 0.5) * 30,
                value: pointsPerOrb
            })
        }
        return orbs
    }

    spawnOrbsRandom(amount) {
        const orbs = []

        if (amount <= 0) return orbs

        // Spawn orbs randomly across the map
        const orbCount = Math.min(15, Math.max(1, Math.floor(amount / 10)))
        const pointsPerOrb = Math.floor(amount / orbCount)

        for (let i = 0; i < orbCount; i++) {
            orbs.push({
                id: Math.random().toString(36).substr(2, 9),
                x: Math.random() * (WORLD_SIZE - 100) + 50,
                y: Math.random() * (WORLD_SIZE - 100) + 50,
                value: pointsPerOrb
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
        this.foodChanged = true // Ensure first tick sends food
        this.intervalId = setInterval(() => {
            if (!this.active) return

            const playersObject = {}
            for (const [id, player] of this.players) {
                if (player.alive) {
                    playersObject[id] = {
                        id: player.id,
                        username: player.username,
                        segments: player.segments, // Could limit this further if needed
                        color: player.color,
                        alive: player.alive,
                        points: player.points // Send raw points
                    }
                }
            }

            // Debug logs disabled for performance
            // const playerCount = Object.keys(playersObject).length
            // if (playerCount > 0) {
            //     console.log(`[Room ${this.roomId.slice(0, 8)}] Broadcasting ${playerCount} players, ${this.food.length} food, leaderboard: ${this.getLeaderboard().length}`)
            // }

            const update = {
                players: playersObject,
                moneyOrbs: this.moneyOrbs,
                leaderboard: this.getLeaderboard(),
                playerCount: this.players.size
            }

            // Only send food if it changed
            if (this.foodChanged) {
                update.food = this.food
                this.foodChanged = false
            }

            this.io.to(this.roomId).emit('gameState', update)
        }, 15) // ~66Hz update rate
    }

    stop() {
        this.active = false
        if (this.intervalId) {
            clearInterval(this.intervalId)
        }
        // clean up any pending timeouts
        for (const timeout of this.cleanupTimeouts) {
            clearTimeout(timeout)
        }
        this.cleanupTimeouts.clear()
    }
}
