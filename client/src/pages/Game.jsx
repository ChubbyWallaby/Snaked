import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { io } from 'socket.io-client'
import axios from 'axios'
import './Game.css'

// Game Constants
const GAME_FEE = 0.5
const MIN_PLAY_TIME = 3 * 60 * 1000 // 3 minutes in milliseconds
const WORLD_SIZE = 4000
const INITIAL_SNAKE_LENGTH = 10
const SEGMENT_RADIUS = 12
const FOOD_RADIUS = 8
const BOOST_SPEED_MULTIPLIER = 2
const NORMAL_SPEED = 2.5

// Colors
const SNAKE_COLORS = [
    '#00ff88', '#ff00aa', '#00d4ff', '#ffd700', '#ff6600',
    '#9933ff', '#00ffcc', '#ff3366', '#66ff33', '#ff9900'
]

function Game() {
    const { user, refreshBalance } = useAuth()
    const navigate = useNavigate()
    const canvasRef = useRef(null)
    const socketRef = useRef(null)
    const gameLoopRef = useRef(null)
    const lastFrameTimeRef = useRef(Date.now())

    // Game State
    const [gameStatus, setGameStatus] = useState('lobby') // 'lobby', 'waiting', 'playing', 'dead', 'spectating'
    const [gameStartTime, setGameStartTime] = useState(null)
    const [playTime, setPlayTime] = useState(0)
    const [inGameBalance, setInGameBalance] = useState(0)
    const [collectedMoney, setCollectedMoney] = useState(0)
    const [leaderboard, setLeaderboard] = useState([])
    const [playerCount, setPlayerCount] = useState(0)
    const [error, setError] = useState('')
    const [snakeLength, setSnakeLength] = useState(INITIAL_SNAKE_LENGTH)

    // Lobby State
    const [lobbyPlayers, setLobbyPlayers] = useState(0)
    const [lobbyMaxPlayers, setLobbyMaxPlayers] = useState(50)
    const [lobbyTimeLeft, setLobbyTimeLeft] = useState(60)

    // Player State (local for rendering)
    const playerRef = useRef({
        id: null,
        segments: [],
        direction: { x: 1, y: 0 },
        targetDirection: { x: 1, y: 0 },
        speed: NORMAL_SPEED,
        color: SNAKE_COLORS[0],
        boosting: false,
        boostTick: 0,
        money: GAME_FEE,
        alive: true
    })

    // Game Objects
    const gameStateRef = useRef({
        players: new Map(),
        food: [],
        moneyOrbs: [],
        camera: { x: 0, y: 0 }
    })

    // Mouse position
    const mouseRef = useRef({ x: 0, y: 0 })

    // Initialize game
    const startGame = async () => {
        if ((user?.balance || 0) < GAME_FEE) {
            setError('Insufficient balance to play')
            return
        }

        try {
            // Deduct game fee
            await axios.post('/api/game/join')
            await refreshBalance()

            setGameStatus('waiting')
            setCollectedMoney(0)
            setInGameBalance(GAME_FEE)

            // Connect to game server and join lobby queue
            const socket = connectToServer()
            socket.emit('joinLobby')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join game')
        }
    }

    const connectToServer = useCallback(() => {
        // Use Env Var -> Hardcoded Fallback (Prod) -> Relative (Dev)
        const socketUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://snaked.onrender.com' : window.location.origin)

        console.log('🔌 Connecting to Socket:', socketUrl)
        const socket = io(socketUrl, {
            auth: { token: localStorage.getItem('token') }
        })

        socketRef.current = socket

        socket.on('connect', () => {
            console.log('Connected to game server')
        })

        socket.on('lobbyUpdate', (data) => {
            setLobbyPlayers(data.players)
            setLobbyMaxPlayers(data.maxPlayers)
            setLobbyTimeLeft(data.timeLeft)
        })

        socket.on('gameStart', ({ roomId, player }) => {
            setGameStatus('playing')
            setGameStartTime(Date.now())

            // Clear stale data from previous games
            gameStateRef.current.players = new Map()
            gameStateRef.current.food = []
            gameStateRef.current.moneyOrbs = []

            // Initialize local player with server data
            if (player) {
                playerRef.current.id = player.id
                playerRef.current.segments = player.segments
                playerRef.current.color = player.color
                playerRef.current.alive = true
                setSnakeLength(player.segments.length)
            }
        })

        socket.on('gameState', (state) => {
            gameStateRef.current.players = new Map(Object.entries(state.players))
            gameStateRef.current.food = state.food
            gameStateRef.current.moneyOrbs = state.moneyOrbs
            setLeaderboard(state.leaderboard || [])
            setPlayerCount(state.playerCount || 0)
        })

        socket.on('playerJoined', (player) => {
            gameStateRef.current.players.set(player.id, player)
        })

        socket.on('playerLeft', (playerId) => {
            gameStateRef.current.players.delete(playerId)
        })

        socket.on('playerDied', (data) => {
            // Remove dead player from local state (prevents ghost snakes)
            if (data.playerId !== playerRef.current.id) {
                gameStateRef.current.players.delete(data.playerId)
            } else {
                handleDeath(data)
            }
            // Add money orbs where player died
            if (data.moneyOrbs) {
                gameStateRef.current.moneyOrbs.push(...data.moneyOrbs)
            }
        })

        socket.on('moneyCollected', (data) => {
            if (data.playerId === playerRef.current.id) {
                setCollectedMoney(prev => prev + data.amount)
                setInGameBalance(prev => prev + data.amount)
            }
            // Remove collected orb
            gameStateRef.current.moneyOrbs = gameStateRef.current.moneyOrbs.filter(
                orb => orb.id !== data.orbId
            )
        })

        socket.on('init', (data) => {
            playerRef.current.id = data.playerId
            playerRef.current.color = SNAKE_COLORS[data.colorIndex || 0]
            playerRef.current.segments = data.segments
            playerRef.current.money = GAME_FEE
        })

        socket.on('disconnect', () => {
            console.log('Disconnected from game server')
        })

        return socket
    }, [])

    const handleDeath = (data) => {
        setGameStatus('dead')

        const timePlayedMs = Date.now() - gameStartTime
        const canKeepMoney = timePlayedMs >= MIN_PLAY_TIME

        if (canKeepMoney) {
            // Transfer collected money to balance
            axios.post('/api/game/end', {
                earnings: collectedMoney,
                survived: false
            }).then(() => refreshBalance())
        }
    }

    const handleLeaveGame = async () => {
        const timePlayedMs = Date.now() - gameStartTime
        const canKeepMoney = timePlayedMs >= MIN_PLAY_TIME

        if (canKeepMoney && gameStatus === 'playing') {
            try {
                await axios.post('/api/game/end', {
                    earnings: collectedMoney + inGameBalance,
                    survived: true
                })
                await refreshBalance()
            } catch (err) {
                console.error('Failed to save earnings:', err)
            }
        }

        if (socketRef.current) {
            socketRef.current.disconnect()
        }

        if (gameLoopRef.current) {
            cancelAnimationFrame(gameLoopRef.current)
        }

        navigate('/dashboard')
    }

    // Game loop
    useEffect(() => {
        if (gameStatus !== 'playing' && gameStatus !== 'spectating') return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        // Game loop with delta-time for consistent speed
        const gameLoop = () => {
            const now = Date.now()
            const deltaTime = (now - lastFrameTimeRef.current) / 16.67 // Normalize to 60fps
            lastFrameTimeRef.current = now

            update(deltaTime)
            render(ctx)
            gameLoopRef.current = requestAnimationFrame(gameLoop)
        }

        gameLoop()

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current)
            }
        }
    }, [gameStatus])

    // Timer update
    useEffect(() => {
        if (gameStatus !== 'playing') return

        const interval = setInterval(() => {
            if (gameStartTime) {
                setPlayTime(Date.now() - gameStartTime)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [gameStatus, gameStartTime])

    // Mouse movement tracking
    useEffect(() => {
        const handleMouseMove = (e) => {
            const canvas = canvasRef.current
            if (!canvas) return

            const rect = canvas.getBoundingClientRect()
            const centerX = rect.width / 2
            const centerY = rect.height / 2

            const dx = e.clientX - centerX
            const dy = e.clientY - centerY
            const length = Math.sqrt(dx * dx + dy * dy)

            if (length > 0) {
                mouseRef.current = { x: dx / length, y: dy / length }
                playerRef.current.targetDirection = { x: dx / length, y: dy / length }
            }
        }

        const handleMouseDown = () => {
            playerRef.current.boosting = true
            playerRef.current.speed = NORMAL_SPEED * BOOST_SPEED_MULTIPLIER
        }

        const handleMouseUp = () => {
            playerRef.current.boosting = false
            playerRef.current.speed = NORMAL_SPEED
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mouseup', handleMouseUp)

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

    // Check collision between point and circle
    const pointInCircle = (px, py, cx, cy, radius) => {
        const dx = px - cx
        const dy = py - cy
        return dx * dx + dy * dy <= radius * radius
    }

    // Update game state (deltaTime normalized to 60fps: 1.0 = 60fps, 2.0 = 30fps)
    const update = (deltaTime = 1) => {
        const player = playerRef.current
        if (!player.alive || gameStatus !== 'playing') return

        // Cap delta to prevent teleporting on lag spikes
        const clampedDelta = Math.min(deltaTime, 3)

        // Smooth direction turning
        const turnSpeed = 0.1
        player.direction.x += (player.targetDirection.x - player.direction.x) * turnSpeed
        player.direction.y += (player.targetDirection.y - player.direction.y) * turnSpeed

        // Normalize direction
        const len = Math.sqrt(player.direction.x ** 2 + player.direction.y ** 2)
        if (len > 0) {
            player.direction.x /= len
            player.direction.y /= len
        }

        // Move head
        if (player.segments.length > 0) {
            const head = player.segments[0]
            const newHead = {
                x: head.x + player.direction.x * player.speed * clampedDelta,
                y: head.y + player.direction.y * player.speed * clampedDelta
            }

            // Boundary checking
            newHead.x = Math.max(SEGMENT_RADIUS, Math.min(WORLD_SIZE - SEGMENT_RADIUS, newHead.x))
            newHead.y = Math.max(SEGMENT_RADIUS, Math.min(WORLD_SIZE - SEGMENT_RADIUS, newHead.y))

            // Move segments
            player.segments.unshift(newHead)

            // Check food collision - GROW when eating!
            let foodEaten = 0
            gameStateRef.current.food = gameStateRef.current.food.filter(food => {
                if (pointInCircle(newHead.x, newHead.y, food.x, food.y, SEGMENT_RADIUS + FOOD_RADIUS)) {
                    foodEaten++
                    return false // Remove eaten food
                }
                return true
            })

            // Grow snake for each food eaten (don't pop tail)
            if (foodEaten > 0) {
                // Add new segments for each food eaten (Growth Rate: 5 segments/food)
                const segmentsToAdd = foodEaten * 5
                for (let i = 0; i < segmentsToAdd; i++) {
                    const tail = player.segments[player.segments.length - 1]
                    player.segments.push({ x: tail.x, y: tail.y })
                }
                // Update length display
                setSnakeLength(player.segments.length)

                // Respawn food that was eaten
                for (let i = 0; i < foodEaten; i++) {
                    gameStateRef.current.food.push({
                        x: Math.random() * WORLD_SIZE,
                        y: Math.random() * WORLD_SIZE,
                        color: SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)]
                    })
                }
            } else {
                // Only pop tail if no food eaten (normal movement)
                // Handle boosting (lose length)
                // Match boost consumption rate to be slower (every 10th frame)
                if (player.boosting && player.segments.length > 5) {
                    player.boostTick++
                    if (player.boostTick % 10 === 0) {
                        player.segments.pop() // Extra pop for boost cost
                    }
                    player.segments.pop() // Normal movement pop
                } else {
                    player.segments.pop() // Normal movement pop
                }
            }

            // Update length display
            setSnakeLength(player.segments.length)

            // Update camera
            gameStateRef.current.camera.x = newHead.x - window.innerWidth / 2
            gameStateRef.current.camera.y = newHead.y - window.innerHeight / 2

            // Send position to server
            if (socketRef.current) {
                socketRef.current.emit('move', {
                    segments: player.segments, // Send full segments for sync
                    direction: player.direction
                })
            }
        }
    }

    // Render game
    const render = (ctx) => {
        const canvas = canvasRef.current
        const camera = gameStateRef.current.camera

        // Clear canvas
        ctx.fillStyle = '#0a0a0f'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)'
        ctx.lineWidth = 1
        const gridSize = 50
        const offsetX = -camera.x % gridSize
        const offsetY = -camera.y % gridSize

        for (let x = offsetX; x < canvas.width; x += gridSize) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, canvas.height)
            ctx.stroke()
        }

        for (let y = offsetY; y < canvas.height; y += gridSize) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(canvas.width, y)
            ctx.stroke()
        }

        // Draw world boundary
        ctx.strokeStyle = '#ff4444'
        ctx.lineWidth = 4
        ctx.strokeRect(-camera.x, -camera.y, WORLD_SIZE, WORLD_SIZE)

        // Draw food
        gameStateRef.current.food.forEach(food => {
            const screenX = food.x - camera.x
            const screenY = food.y - camera.y

            if (screenX > -50 && screenX < canvas.width + 50 &&
                screenY > -50 && screenY < canvas.height + 50) {
                ctx.beginPath()
                ctx.arc(screenX, screenY, FOOD_RADIUS, 0, Math.PI * 2)
                ctx.fillStyle = food.color || '#00ff88'
                ctx.fill()

                // Glow effect
                ctx.shadowBlur = 10
                ctx.shadowColor = food.color || '#00ff88'
                ctx.fill()
                ctx.shadowBlur = 0
            }
        })

        // Draw money orbs
        gameStateRef.current.moneyOrbs.forEach(orb => {
            const screenX = orb.x - camera.x
            const screenY = orb.y - camera.y

            if (screenX > -50 && screenX < canvas.width + 50 &&
                screenY > -50 && screenY < canvas.height + 50) {
                ctx.beginPath()
                ctx.arc(screenX, screenY, 10 + orb.value * 2, 0, Math.PI * 2)
                ctx.fillStyle = '#ffd700'
                ctx.fill()

                // Glow effect
                ctx.shadowBlur = 15
                ctx.shadowColor = '#ffd700'
                ctx.fill()
                ctx.shadowBlur = 0

                // $ symbol
                ctx.fillStyle = '#000'
                ctx.font = 'bold 10px Arial'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText('$', screenX, screenY)
            }
        })

        // Draw other players (skip local player and dead players)
        gameStateRef.current.players.forEach((otherPlayer, id) => {
            if (id === playerRef.current.id) return
            if (otherPlayer.alive === false) return // Skip dead players

            otherPlayer.segments?.forEach((segment, i) => {
                const screenX = segment.x - camera.x
                const screenY = segment.y - camera.y

                if (screenX > -50 && screenX < canvas.width + 50 &&
                    screenY > -50 && screenY < canvas.height + 50) {
                    ctx.beginPath()
                    ctx.arc(screenX, screenY, Math.max(3, SEGMENT_RADIUS - i * 0.1), 0, Math.PI * 2)
                    ctx.fillStyle = otherPlayer.color || '#ff00aa'
                    ctx.fill()
                }
            })
        })

        // Draw player snake
        const player = playerRef.current
        player.segments.forEach((segment, i) => {
            const screenX = segment.x - camera.x
            const screenY = segment.y - camera.y

            ctx.beginPath()
            ctx.arc(screenX, screenY, Math.max(3, SEGMENT_RADIUS - i * 0.05), 0, Math.PI * 2)

            // Gradient for player
            const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, SEGMENT_RADIUS)
            gradient.addColorStop(0, player.color)
            gradient.addColorStop(1, player.color + '80')
            ctx.fillStyle = i === 0 ? player.color : gradient
            ctx.fill()

            // Head eyes
            if (i === 0) {
                const eyeOffset = 4
                const eyeRadius = 3
                ctx.fillStyle = '#fff'
                ctx.beginPath()
                ctx.arc(screenX + player.direction.x * eyeOffset - player.direction.y * 4,
                    screenY + player.direction.y * eyeOffset + player.direction.x * 4,
                    eyeRadius, 0, Math.PI * 2)
                ctx.fill()
                ctx.beginPath()
                ctx.arc(screenX + player.direction.x * eyeOffset + player.direction.y * 4,
                    screenY + player.direction.y * eyeOffset - player.direction.x * 4,
                    eyeRadius, 0, Math.PI * 2)
                ctx.fill()
            }
        })

        // Boost trail effect
        if (player.boosting && player.segments.length > 0) {
            const tail = player.segments[player.segments.length - 1]
            ctx.beginPath()
            ctx.arc(tail.x - camera.x, tail.y - camera.y, 5, 0, Math.PI * 2)
            ctx.fillStyle = player.color + '40'
            ctx.fill()
        }
    }

    // Format time
    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const canKeepMoney = playTime >= MIN_PLAY_TIME

    // Initialize player segments on first play
    useEffect(() => {
        if (gameStatus === 'playing' && playerRef.current.segments.length === 0) {
            const startX = WORLD_SIZE / 2 + (Math.random() - 0.5) * 500
            const startY = WORLD_SIZE / 2 + (Math.random() - 0.5) * 500

            playerRef.current.segments = Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, i) => ({
                x: startX - i * 10,
                y: startY
            }))

            // Initialize some food for local testing
            gameStateRef.current.food = Array.from({ length: 200 }, () => ({
                x: Math.random() * WORLD_SIZE,
                y: Math.random() * WORLD_SIZE,
                color: SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)]
            }))
        }
    }, [gameStatus])

    return (
        <div className="game-page">
            {gameStatus === 'lobby' && (
                <div className="game-lobby">
                    <div className="lobby-content card">
                        <h1>🐍 Ready to Play?</h1>

                        <div className="game-info">
                            <div className="info-item">
                                <span className="info-label">Entry Fee</span>
                                <span className="info-value money">-${GAME_FEE.toFixed(3)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Your Balance</span>
                                <span className="info-value money">${(user?.balance || 0).toFixed(2)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Min. Play Time</span>
                                <span className="info-value">10 minutes</span>
                            </div>
                        </div>

                        <div className="rules">
                            <h3>Rules</h3>
                            <ul>
                                <li>Move with your mouse, click to boost</li>
                                <li>Eat food and money orbs to grow</li>
                                <li>Avoid crashing into other snakes</li>
                                <li>Play for 10+ minutes to keep your earnings</li>
                            </ul>
                        </div>

                        {error && <div className="game-error">{error}</div>}

                        <div className="lobby-actions">
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={startGame}
                                disabled={(user?.balance || 0) < GAME_FEE}
                            >
                                🎮 Start Game (-${GAME_FEE.toFixed(3)})
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/dashboard')}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {gameStatus === 'waiting' && (
                <div className="game-lobby">
                    <div className="lobby-content card" style={{ textAlign: 'center' }}>
                        <h1>⏳ Waiting for Players...</h1>

                        <div className="lobby-timer" style={{ fontSize: '3rem', margin: '20px 0', color: lobbyTimeLeft < 10 ? '#ff4444' : '#fff' }}>
                            {lobbyTimeLeft}s
                        </div>

                        <div className="lobby-stats" style={{ marginBottom: '30px' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
                                Players in Queue: <span style={{ color: '#00ff88' }}>{lobbyPlayers}</span> / {lobbyMaxPlayers}
                            </div>
                            {lobbyPlayers === 1 ? (
                                <p style={{ color: '#888' }}>Waiting for at least one more player to start...</p>
                            ) : (
                                <p style={{ color: '#888' }}>Game starting soon!</p>
                            )}
                        </div>

                        <button
                            className="btn btn-danger"
                            onClick={() => {
                                if (socketRef.current) socketRef.current.disconnect()
                                setGameStatus('lobby')
                            }}
                        >
                            Cancel & Leave
                        </button>
                    </div>
                </div>
            )}

            {(gameStatus === 'playing' || gameStatus === 'spectating') && (
                <>
                    <canvas ref={canvasRef} className="game-canvas" />

                    {/* HUD */}
                    <div className="game-hud">
                        <div className="hud-top">
                            <div className="hud-item timer">
                                <span className="hud-label">Time</span>
                                <span className={`hud-value ${canKeepMoney ? 'safe' : ''}`}>
                                    {formatTime(playTime)}
                                </span>
                                {!canKeepMoney && (
                                    <span className="time-warning">
                                        {formatTime(MIN_PLAY_TIME - playTime)} until safe
                                    </span>
                                )}
                            </div>

                            <div className="hud-item balance">
                                <span className="hud-label">In-Game Balance</span>
                                <span className="hud-value money">${inGameBalance.toFixed(3)}</span>
                            </div>

                            <div className="hud-item collected">
                                <span className="hud-label">Collected</span>
                                <span className="hud-value money-positive">+${collectedMoney.toFixed(3)}</span>
                            </div>

                            <div className="hud-item length">
                                <span className="hud-label">Length</span>
                                <span className="hud-value">{snakeLength}</span>
                            </div>
                        </div>

                        <div className="hud-left">
                            <div className="leaderboard">
                                <h4>🏆 Leaderboard</h4>
                                <ol>
                                    {leaderboard.slice(0, 5).map((player, i) => (
                                        <li key={player.id} className={player.id === playerRef.current.id ? 'you' : ''}>
                                            <span className="rank">{i + 1}</span>
                                            <span className="name">{player.username}</span>
                                            <span className="score">{player.length}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <div className="player-count">
                                👥 {playerCount} players online
                            </div>
                        </div>

                        <button className="leave-button btn btn-danger btn-sm" onClick={handleLeaveGame}>
                            {canKeepMoney ? '💰 Cash Out & Leave' : '🚪 Leave (Lose Money)'}
                        </button>
                    </div>

                    {/* Boost indicator */}
                    <div className="boost-indicator">
                        {playerRef.current.boosting && <span className="boosting">⚡ BOOSTING</span>}
                    </div>
                </>
            )}

            {gameStatus === 'dead' && (
                <div className="death-screen">
                    <div className="death-content card">
                        <h1>💀 You Died!</h1>

                        <div className="death-stats">
                            <div className="death-stat">
                                <span className="stat-label">Time Played</span>
                                <span className="stat-value">{formatTime(playTime)}</span>
                            </div>
                            <div className="death-stat">
                                <span className="stat-label">Money Collected</span>
                                <span className="stat-value money">${collectedMoney.toFixed(3)}</span>
                            </div>
                            <div className="death-stat">
                                <span className="stat-label">Status</span>
                                <span className={`stat-value ${canKeepMoney ? 'money-positive' : 'money-negative'}`}>
                                    {canKeepMoney ? 'Money Saved!' : 'Money Lost'}
                                </span>
                            </div>
                        </div>

                        {!canKeepMoney && (
                            <p className="death-note">
                                You needed {formatTime(MIN_PLAY_TIME - playTime)} more to keep your money.
                            </p>
                        )}

                        <div className="death-actions">
                            <button className="btn btn-primary" onClick={startGame}>
                                Play Again
                            </button>
                            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

import ErrorBoundary from '../components/ErrorBoundary'

export default function GameWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <Game />
        </ErrorBoundary>
    )
}
