import { db } from '../firebase.js'

// Firestore collection references
const usersRef = db.collection('users')
const transactionsRef = db.collection('transactions')
const gameSessionsRef = db.collection('gameSessions')

// Initialize database (no-op for Firestore, kept for compatibility)
export async function initDatabase() {
    console.log('📦 Database initialized with Firestore')
}

// User operations
export async function getUser(id) {
    const doc = await usersRef.doc(id).get()
    if (doc.exists) {
        return { id: doc.id, ...doc.data() }
    }
    return null
}

export async function getUserByStripeAccountId(stripeAccountId) {
    const snapshot = await usersRef.where('stripeAccountId', '==', stripeAccountId).limit(1).get()
    if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        return { id: doc.id, ...doc.data() }
    }
    return null
}

export async function getUserByEmail(email) {
    const snapshot = await usersRef.where('email', '==', email).limit(1).get()
    if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        return { id: doc.id, ...doc.data() }
    }
    return null
}

export async function createUser(userData) {
    await usersRef.doc(userData.id).set(userData)
    return userData
}

export async function updateUser(id, updates) {
    const userRef = usersRef.doc(id)
    const doc = await userRef.get()

    if (doc.exists) {
        await userRef.update(updates)
        const updated = await userRef.get()
        return { id: updated.id, ...updated.data() }
    }
    return null
}

// Transaction operations
export async function addTransaction(transaction) {
    await transactionsRef.doc(transaction.id).set(transaction)
    return transaction
}

export async function getTransactions(userId) {
    const snapshot = await transactionsRef
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get()

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function getAllTransactions() {
    const snapshot = await transactionsRef
        .orderBy('createdAt', 'desc')
        .get()

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function getTransaction(id) {
    const doc = await transactionsRef.doc(id).get()
    if (doc.exists) {
        return { id: doc.id, ...doc.data() }
    }
    return null
}

export async function updateTransaction(id, updates) {
    const txRef = transactionsRef.doc(id)
    const doc = await txRef.get()

    if (doc.exists) {
        await txRef.update(updates)
        const updated = await txRef.get()
        return { id: updated.id, ...updated.data() }
    }
    return null
}

// Game session operations
export async function addGameSession(session) {
    await gameSessionsRef.doc(session.id).set(session)
    return session
}

export async function updateGameSession(sessionId, updates) {
    const sessionRef = gameSessionsRef.doc(sessionId)
    const doc = await sessionRef.get()

    if (doc.exists) {
        await sessionRef.update(updates)
        const updated = await sessionRef.get()
        return { id: updated.id, ...updated.data() }
    }
    return null
}

export async function getGameSessions(userId) {
    const snapshot = await gameSessionsRef
        .where('userId', '==', userId)
        .get()

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}
