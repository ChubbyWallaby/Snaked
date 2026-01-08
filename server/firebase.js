import { getFirestore } from 'firebase-admin/firestore'

// ... lines 3-59 ...

export const db = admin.apps.length ? getFirestore(admin.app(), process.env.FIREBASE_DATABASE_ID) : null
export const auth = admin.apps.length ? admin.auth() : null

export default admin
