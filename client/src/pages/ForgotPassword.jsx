import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DecorativeOrbs from '../components/DecorativeOrbs'
import './Auth.css'

function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const { resetPassword } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess(false)

        const result = await resetPassword(email)

        if (result.success) {
            setSuccess(true)
        } else {
            setError(result.error)
        }

        setLoading(false)
    }

    return (
        <div className="auth-page">
            <div className="auth-left">
                <Link to="/login" className="back-link">
                    ← Back to login
                </Link>

                <div className="auth-card">
                    <div className="auth-header">
                        <h1>Reset Password</h1>
                        <p>Enter your email and we'll send you a reset link</p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="auth-success">
                            <div className="success-icon">✓</div>
                            <h2>Check your email</h2>
                            <p>
                                We've sent a password reset link to <strong>{email}</strong>.
                                Click the link in the email to reset your password.
                            </p>
                            <Link to="/login" className="btn btn-primary btn-lg auth-submit">
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="input-group">
                                <label htmlFor="email">Email Address</label>
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

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg auth-submit"
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>

                            <div className="auth-footer">
                                <p>
                                    Remember your password?{' '}
                                    <Link to="/login">Sign in</Link>
                                </p>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <div className="auth-right">
                <DecorativeOrbs />
            </div>
        </div>
    )
}

export default ForgotPassword
