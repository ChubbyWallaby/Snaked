import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './styles/index.css'
import axios from 'axios'

// Configure Axios default URL
// In development, this is undefined (uses proxy /api). 
// In production, this must be set to the backend URL.
// Configure Axios default URL
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://snaked.onrender.com' : '')

if (API_URL) {
    axios.defaults.baseURL = API_URL
    console.log('🔗 Connected to Backend:', API_URL)
} else {
    console.log('⚠️ No API URL configured, using relative paths')
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
