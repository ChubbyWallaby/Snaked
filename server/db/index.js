import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json')
const GAME_SESSIONS_FILE = path.join(DATA_DIR, 'game_sessions.json')

// In-memory storage
let users = new Map()
let emailIndex = new Map() // email -> userId
let transactions = []
let gameSessions = []

// Write Queues
let usersDirty = false
let transactionsDirty = false
let sessionsDirty = false

// Initialize database
export async function initDatabase() {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    // Load users
    if (fs.existsSync(USERS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
            users = new Map(Object.entries(data))

            // Rebuild email index
            for (const [id, user] of users) {
                if (user.email) {
                    emailIndex.set(user.email, id)
                }
            }
            console.log(`Loaded ${users.size} users from database`)
        } catch (err) {
            console.log('Starting with fresh users database')
        }
    }

    // Load transactions
    if (fs.existsSync(TRANSACTIONS_FILE)) {
        try {
            transactions = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'))
            console.log(`Loaded ${transactions.length} transactions from database`)
        } catch (err) {
            console.log('Starting with fresh transactions database')
            transactions = []
        }
    }

    // Load game sessions
    if (fs.existsSync(GAME_SESSIONS_FILE)) {
        try {
            gameSessions = JSON.parse(fs.readFileSync(GAME_SESSIONS_FILE, 'utf8'))
            console.log(`Loaded ${gameSessions.length} game sessions from database`)
        } catch (err) {
            console.log('Starting with fresh game sessions database')
            gameSessions = []
        }
    }

    // Start flush interval
    setInterval(flushToDisk, 2000)

    console.log('📦 Database initialized with Write Queue')
}

// Save helpers
function flushToDisk() {
    if (usersDirty) {
        const data = Object.fromEntries(users)
        fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2))
        usersDirty = false
    }

    if (transactionsDirty) {
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2))
        transactionsDirty = false
    }

    if (sessionsDirty) {
        fs.writeFileSync(GAME_SESSIONS_FILE, JSON.stringify(gameSessions, null, 2))
        sessionsDirty = false
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Flushing database before exit...')
    flushToDisk()
    process.exit()
})

// User operations
export async function getUser(id) {
    return users.get(id) || null
}

export async function getUserByStripeAccountId(stripeAccountId) {
    // This is still O(n) but less frequent than login
    for (const user of users.values()) {
        if (user.stripeAccountId === stripeAccountId) {
            return user
        }
    }
    return null
}

export async function getUserByEmail(email) {
    const id = emailIndex.get(email)
    if (id) {
        return users.get(id)
    }
    return null
}

export async function createUser(userData) {
    users.set(userData.id, userData)
    if (userData.email) {
        emailIndex.set(userData.email, userData.id)
    }
    usersDirty = true
    return userData
}

export async function updateUser(id, updates) {
    const user = users.get(id)
    if (user) {
        // Handle email change
        if (updates.email && updates.email !== user.email) {
            emailIndex.delete(user.email)
            emailIndex.set(updates.email, id)
        }

        const updated = { ...user, ...updates }
        users.set(id, updated)
        usersDirty = true
        return updated
    }
    return null
}

// Transaction operations
export async function addTransaction(transaction) {
    transactions.push(transaction)
    transactionsDirty = true
    return transaction
}

export async function getTransactions(userId) {
    return transactions
        .filter(tx => tx.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50) // Limit to last 50
}

export async function getAllTransactions() {
    return transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getTransaction(id) {
    return transactions.find(tx => tx.id === id) || null
}

export async function updateTransaction(id, updates) {
    const index = transactions.findIndex(tx => tx.id === id)
    if (index >= 0) {
        transactions[index] = { ...transactions[index], ...updates }
        transactionsDirty = true
        return transactions[index]
    }
    return null
}

// Game session operations
export async function addGameSession(session) {
    gameSessions.push(session)
    sessionsDirty = true
    return session
}

export async function updateGameSession(sessionId, updates) {
    const index = gameSessions.findIndex(s => s.id === sessionId)
    if (index >= 0) {
        gameSessions[index] = { ...gameSessions[index], ...updates }
        sessionsDirty = true
        return gameSessions[index]
    }
    return null
}

export async function getGameSessions(userId) {
    return gameSessions.filter(s => s.userId === userId)
}
