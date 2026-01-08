import admin from 'firebase-admin'

// Initialize Firebase Admin SDK
// Note: dotenv.config() must be called before this file is imported (done in index.js)

// Handle private key - Render may store it with literal \n or actual newlines
let privateKey = process.env.FIREBASE_PRIVATE_KEY

if (privateKey) {
    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n')

    // If wrapped in quotes, remove them
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1)
    }
}

const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL
}

// Log initialization status (without sensitive data)
console.log('🔥 Firebase config check:')
console.log('   - project_id:', serviceAccount.project_id ? '✓ set' : '✗ missing')
console.log('   - client_email:', serviceAccount.client_email ? '✓ set' : '✗ missing')
console.log('   - private_key:', privateKey ? `✓ set (${privateKey.length} chars)` : '✗ missing')

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        })
        console.log('🔥 Firebase Admin initialized successfully')
    } catch (err) {
        console.error('❌ Firebase Admin initialization failed:', err.message)
        // Don't exit - allow server to start for legacy auth
    }
}

export const db = admin.firestore()
export const auth = admin.auth()

export default admin
