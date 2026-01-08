/**
 * Migration Script: JSON files to Firestore
 * 
 * Run this script once to migrate existing data from JSON files to Firestore.
 * Usage: node scripts/migrate-to-firebase.js
 * 
 * Make sure FIREBASE_* environment variables are set before running.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Import Firebase after env vars are loaded
import { db } from '../firebase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'db', 'data')

async function migrateCollection(fileName, collectionName) {
    const filePath = path.join(DATA_DIR, fileName)

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${fileName} not found, skipping...`)
        return 0
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const collection = db.collection(collectionName)

    let count = 0

    if (Array.isArray(data)) {
        // For transactions and game_sessions (arrays)
        const batch = db.batch()
        for (const item of data) {
            const docRef = collection.doc(item.id)
            batch.set(docRef, item)
            count++
        }
        await batch.commit()
    } else {
        // For users (object with id keys)
        const batch = db.batch()
        for (const [id, item] of Object.entries(data)) {
            const docRef = collection.doc(id)
            batch.set(docRef, item)
            count++
        }
        await batch.commit()
    }

    console.log(`✅ Migrated ${count} documents to ${collectionName}`)
    return count
}

async function main() {
    console.log('🚀 Starting Firebase migration...\n')

    try {
        const usersCount = await migrateCollection('users.json', 'users')
        const txCount = await migrateCollection('transactions.json', 'transactions')
        const sessionsCount = await migrateCollection('game_sessions.json', 'gameSessions')

        console.log('\n📊 Migration Summary:')
        console.log(`   Users: ${usersCount}`)
        console.log(`   Transactions: ${txCount}`)
        console.log(`   Game Sessions: ${sessionsCount}`)
        console.log('\n✨ Migration complete!')

        process.exit(0)
    } catch (error) {
        console.error('❌ Migration failed:', error)
        process.exit(1)
    }
}

main()
