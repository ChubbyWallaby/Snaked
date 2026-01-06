import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            fetchUser(token)
        } else {
            setLoading(false)
        }
    }, [])

    const fetchUser = async (token) => {
        try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            const response = await axios.get('/api/auth/me')
            setUser(response.data.user)
        } catch (err) {
            localStorage.removeItem('token')
            delete axios.defaults.headers.common['Authorization']
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        try {
            setError(null)
            const response = await axios.post('/api/auth/login', { email, password })
            const { token, user } = response.data
            localStorage.setItem('token', token)
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            setUser(user)
            return { success: true }
        } catch (err) {
            const message = err.response?.data?.message || 'Login failed'
            setError(message)
            return { success: false, error: message }
        }
    }

    const register = async (email, password, username) => {
        try {
            setError(null)
            const response = await axios.post('/api/auth/register', { email, password, username })
            const { token, user } = response.data
            localStorage.setItem('token', token)
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            setUser(user)
            return { success: true }
        } catch (err) {
            const message = err.response?.data?.message || 'Registration failed'
            setError(message)
            return { success: false, error: message }
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        delete axios.defaults.headers.common['Authorization']
        setUser(null)
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
        loading,
        error,
        login,
        register,
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
