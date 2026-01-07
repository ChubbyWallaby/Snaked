import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

function Dashboard() {
    const { user } = useAuth()

    return (
        <div className="dashboard-page page">
            <div className="container">
                <header className="dashboard-header">
                    <h1>Welcome, <span className="username">{user?.username}</span>!</h1>
                    <p className="dashboard-subtitle">Your gaming headquarters</p>
                </header>

                <div className="dashboard-grid">
                    {/* Balance Card */}
                    <div className="dashboard-card card balance-card">
                        <div className="card-icon">💰</div>
                        <div className="card-content">
                            <span className="card-label">Your Balance</span>
                            <span className="card-value money">{Math.floor(user?.balance || 0)} pts</span>
                        </div>
                        <Link to="/wallet" className="btn btn-secondary btn-sm">
                            Add Funds
                        </Link>
                    </div>

                    {/* Games Played Card */}
                    <div className="dashboard-card card">
                        <div className="card-icon">🎮</div>
                        <div className="card-content">
                            <span className="card-label">Games Played</span>
                            <span className="card-value">{user?.gamesPlayed || 0}</span>
                        </div>
                    </div>

                    {/* Total Earnings Card */}
                    <div className="dashboard-card card">
                        <div className="card-icon">🏆</div>
                        <div className="card-content">
                            <span className="card-label">Total Earnings</span>
                            <span className="card-value money-positive">
                                {Math.floor(user?.totalEarnings || 0)} pts
                            </span>
                        </div>
                    </div>

                    {/* Win Rate Card */}
                    <div className="dashboard-card card">
                        <div className="card-icon">📊</div>
                        <div className="card-content">
                            <span className="card-label">Survival Rate</span>
                            <span className="card-value">{user?.survivalRate || 0}%</span>
                        </div>
                    </div>
                </div>

                {/* Play CTA */}
                <div className="play-cta">
                    <div className="play-cta-content">
                        <h2>Ready to Play?</h2>
                        <p>Entry fee: <span className="money">50 pts</span></p>
                        <p className="play-note">Survive 10 minutes to keep your earnings!</p>
                    </div>
                    <Link
                        to="/game"
                        className={`btn btn-primary btn-lg ${(user?.balance || 0) < 0.005 ? 'btn-disabled' : ''}`}
                    >
                        🎮 Start Game
                    </Link>
                    {(user?.balance || 0) < 0.005 && (
                        <p className="insufficient-funds">
                            Insufficient balance. <Link to="/wallet">Add funds</Link> to play.
                        </p>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="quick-stats">
                    <h3>How to Play</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-icon">🖱️</span>
                            <span className="stat-text">Move with mouse</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-icon">⚡</span>
                            <span className="stat-text">Click to boost speed</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-icon">🍎</span>
                            <span className="stat-text">Eat food to grow</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-icon">💀</span>
                            <span className="stat-text">Avoid other snakes</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
