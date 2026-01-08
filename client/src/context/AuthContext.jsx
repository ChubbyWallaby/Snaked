import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { auth, googleProvider } from '../firebase'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth'

const AuthContext = createContext(null)

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [firebaseUser, setFirebaseUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Listen for Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser)

            if (fbUser) {
                try {
                    // Get Firebase ID token
                    const idToken = await fbUser.getIdToken()
                    axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`

                    // Sync with backend to get full user profile
                    const response = await axios.post('/api/auth/firebase', { idToken })
                    setUser(response.data.user)
                } catch (err) {
                    console.error('Failed to sync Firebase user:', err)
                    // Clear user if backend sync fails
                    setUser(null)
                }
            } else {
                // Check for legacy JWT token
                const legacyToken = localStorage.getItem('token')
                if (legacyToken) {
                    try {
                        axios.defaults.headers.common['Authorization'] = `Bearer ${legacyToken}`
                        const response = await axios.get('/api/auth/me')
                        setUser(response.data.user)
                    } catch (err) {
                        localStorage.removeItem('token')
                        delete axios.defaults.headers.common['Authorization']
                        setUser(null)
                    }
                } else {
                    delete axios.defaults.headers.common['Authorization']
                    setUser(null)
                }
            }

            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    // Login with email/password via Firebase
    const login = async (email, password) => {
        try {
            setError(null)
            const userCredential = await signInWithEmailAndPassword(auth, email, password)

            // Get ID token and sync with backend
            const idToken = await userCredential.user.getIdToken()
            axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`

            const response = await axios.post('/api/auth/firebase', { idToken })
            setUser(response.data.user)

            // Clear legacy token if exists
            localStorage.removeItem('token')

            return { success: true }
        } catch (err) {
            const message = err.code === 'auth/invalid-credential'
                ? 'Invalid email or password'
                : err.message || 'Login failed'
            setError(message)
            return { success: false, error: message }
        }
    }

    // Register with email/password via Firebase
    const register = async (email, password, username) => {
        try {
            setError(null)
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)

            // Update Firebase profile with username
            await updateProfile(userCredential.user, { displayName: username })

            // Get ID token and sync with backend
            const idToken = await userCredential.user.getIdToken()
            axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`

            const response = await axios.post('/api/auth/firebase', { idToken })
            setUser(response.data.user)

            return { success: true }
        } catch (err) {
            let message = 'Registration failed'
            switch (err.code) {
                case 'auth/email-already-in-use':
                    message = 'Email already registered'
                    break
                case 'auth/weak-password':
                    message = 'Password must be at least 6 characters'
                    break
                case 'auth/invalid-email':
                    message = 'Invalid email address'
                    break
                default:
                    message = err.message || 'Registration failed'
            }
            setError(message)
            return { success: false, error: message }
        }
    }

    // Sign in with Google
    const loginWithGoogle = async () => {
        try {
            setError(null)
            const result = await signInWithPopup(auth, googleProvider)

            // Get ID token and sync with backend
            const idToken = await result.user.getIdToken()
            axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`

            const response = await axios.post('/api/auth/firebase', { idToken })
            setUser(response.data.user)

            // Clear legacy token if exists
            localStorage.removeItem('token')

            return { success: true }
        } catch (err) {
            const message = err.code === 'auth/popup-closed-by-user'
                ? 'Sign-in cancelled'
                : err.message || 'Google sign-in failed'
            setError(message)
            return { success: false, error: message }
        }
    }

    // Password reset
    const resetPassword = async (email) => {
        try {
            setError(null)
            await sendPasswordResetEmail(auth, email)
            return { success: true, message: 'Password reset email sent!' }
        } catch (err) {
            let message = 'Failed to send reset email'
            switch (err.code) {
                case 'auth/user-not-found':
                    // Don't reveal if user exists for security
                    return { success: true, message: 'If an account exists, a reset email has been sent.' }
                case 'auth/invalid-email':
                    message = 'Invalid email address'
                    break
                default:
                    message = err.message || 'Failed to send reset email'
            }
            setError(message)
            return { success: false, error: message }
        }
    }

    // Logout
    const logout = async () => {
        try {
            await signOut(auth)
            localStorage.removeItem('token')
            delete axios.defaults.headers.common['Authorization']
            setUser(null)
            setFirebaseUser(null)
        } catch (err) {
            console.error('Logout error:', err)
        }
    }

    const refreshBalance = async () => {
        try {
            const response = await axios.get('/api/wallet/balance')
            setUser(prev => ({ ...prev, balance: response.data.balance }))
        } catch (err) {
            console.error('Failed to refresh balance:', err)
        }
    }

    const refreshUser = async () => {
        try {
            const response = await axios.get('/api/auth/me')
            setUser(response.data.user)
            return response.data.user
        } catch (err) {
            console.error('Failed to refresh user:', err)
        }
    }

    const value = {
        user,
        firebaseUser,
        loading,
        error,
        login,
        register,
        loginWithGoogle,
        resetPassword,
        logout,
        refreshBalance,
        refreshUser,
        isAuthenticated: !!user
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
