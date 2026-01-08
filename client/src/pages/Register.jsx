import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DecorativeOrbs from '../components/DecorativeOrbs'
import './Auth.css'

function Register() {
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [ageVerified, setAgeVerified] = useState(false)
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState('')

    const { register, loginWithGoogle } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validation
        if (!ageVerified) {
            setError('You must confirm you are 18 years of age or older')
            setLoading(false)
            return
        }

        if (!termsAccepted) {
            setError('You must accept the Terms of Service to continue')
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            setLoading(false)
            return
        }

        if (username.length < 3) {
            setError('Username must be at least 3 characters')
            setLoading(false)
            return
        }

        const result = await register(email, password, username)

        if (result.success) {
            navigate('/dashboard')
        } else {
            setError(result.error)
        }

        setLoading(false)
    }

    const handleGoogleSignUp = async () => {
        // For Google sign-up, we still need age verification and terms acceptance
        if (!ageVerified) {
            setError('You must confirm you are 18 years of age or older')
            return
        }

        if (!termsAccepted) {
            setError('You must accept the Terms of Service to continue')
            return
        }

        setGoogleLoading(true)
        setError('')

        const result = await loginWithGoogle()

        if (result.success) {
            navigate('/dashboard')
        } else {
            if (result.error !== 'Sign-in cancelled') {
                setError(result.error)
            }
        }

        setGoogleLoading(false)
    }

    return (
        <div className="auth-page">
            <div className="auth-left">
                <Link to="/" className="back-link">
                    ← Back to home
                </Link>

                <div className="auth-card">
                    <div className="auth-header">
                        <h1>Join Snaked!</h1>
                        <p>Create your free account and start competing</p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    {/* Age Verification - Required for both methods */}
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={ageVerified}
                                onChange={(e) => setAgeVerified(e.target.checked)}
                            />
                            <span>
                                I confirm that I am <strong>18 years of age or older</strong>
                            </span>
                        </label>
                    </div>

                    {/* Terms of Service - Required for both methods */}
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                            />
                            <span>
                                I agree to the{' '}
                                <Link to="/terms" target="_blank" className="terms-link">
                                    Terms of Service
                                </Link>
                            </span>
                        </label>
                    </div>

                    {/* Google Sign-Up Button */}
                    <button
                        type="button"
                        className="btn btn-google"
                        onClick={handleGoogleSignUp}
                        disabled={googleLoading || loading}
                    >
                        <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {googleLoading ? 'Signing up...' : 'Sign up with Google'}
                    </button>

                    <div className="auth-divider">
                        <span>or</span>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="input-group">
                            <label htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                className="input"
                                placeholder="Choose a username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                className="input"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                className="input"
                                placeholder="Min. 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                className="input"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg auth-submit"
                            disabled={loading || googleLoading}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Already have an account?{' '}
                            <Link to="/login">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <DecorativeOrbs />
            </div>
        </div>
    )
}

export default Register
