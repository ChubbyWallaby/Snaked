import admin from 'firebase-admin'

// Initialize Firebase Admin SDK
// Note: dotenv.config() must be called before this file is imported (done in index.js)
const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    })
    console.log('🔥 Firebase Admin initialized successfully')
}

export const db = admin.firestore()
export const auth = admin.auth()

export default admin
