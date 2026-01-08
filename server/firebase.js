import admin from 'firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK
// Supports two methods:
// 1. FIREBASE_SERVICE_ACCOUNT_BASE64 - Base64 encoded service account JSON (recommended)
// 2. Individual env vars: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL

let serviceAccount = null

// Method 1: Base64 encoded service account (most reliable for cloud deployments)
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
        serviceAccount = JSON.parse(decoded)
        console.log('🔥 Loaded Firebase credentials from base64 encoded service account')
    } catch (err) {
        console.error('❌ Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64:', err.message)
    }
}

// Method 2: Individual environment variables (fallback)
if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY
    if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n')
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1)
        }
    }

    serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL
    }
    console.log('🔥 Loaded Firebase credentials from individual env vars')
}

// Log initialization status
if (serviceAccount) {
    console.log('🔥 Firebase config:')
    console.log('   - project_id:', serviceAccount.project_id || 'missing')
    console.log('   - client_email:', serviceAccount.client_email ? '✓' : 'missing')
    console.log('   - private_key:', serviceAccount.private_key ? `✓ (${serviceAccount.private_key.length} chars)` : 'missing')
}

if (!admin.apps.length && serviceAccount) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        })
        console.log('🔥 Firebase Admin initialized successfully')
    } catch (err) {
        console.error('❌ Firebase Admin initialization failed:', err.message)
    }
} else if (!serviceAccount) {
    console.error('❌ No Firebase credentials found! Set FIREBASE_SERVICE_ACCOUNT_BASE64 or individual env vars.')
}

// Use getFirestore to support named databases if provided
export const db = admin.apps.length ? getFirestore(admin.app(), process.env.FIREBASE_DATABASE_ID) : null
export const auth = admin.apps.length ? admin.auth() : null

export default admin
