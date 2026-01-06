import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Navbar.css'

function Navbar() {
    const { user, logout, isAuthenticated } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    <span className="brand-icon">🐍</span>
                    <span className="brand-text">SNAKED!</span>
                </Link>

                <div className="navbar-menu">
                    {isAuthenticated ? (
                        <>
                            <div className="navbar-balance">
                                <span className="balance-label">Balance:</span>
                                <span className="balance-amount money">
                                    ${(user?.balance || 0).toFixed(2)}
                                </span>
                            </div>
                            <Link to="/dashboard" className="nav-link">Dashboard</Link>
                            <Link to="/wallet" className="nav-link">Wallet</Link>
                            {user?.role === 'admin' && <Link to="/admin" className="nav-link">Admin</Link>}
                            <Link to="/game" className="btn btn-primary btn-sm">
                                Play Now
                            </Link>
                            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="nav-link">Login</Link>
                            <Link to="/register" className="btn btn-primary btn-sm">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar
