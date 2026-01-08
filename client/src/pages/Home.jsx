import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Home.css'

function Home() {
    const { isAuthenticated } = useAuth()

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg">
                    <div className="hero-snake snake-1">🐍</div>
                    <div className="hero-snake snake-2">🐍</div>
                    <div className="hero-snake snake-3">🐍</div>
                </div>

                <div className="hero-content">
                    <h1 className="hero-title">
                        <span className="title-line">WATCH.</span>
                        <span className="title-line accent">PLAY.</span>
                        <span className="title-line gold">WIN.</span>
                    </h1>

                    <p className="hero-subtitle">
                        Watch ads to play free. Compete for rewards. Win real prizes in the ultimate multiplayer snake game!
                    </p>

                    <div className="hero-stats">
                        <div className="stat-item">
                            <span className="stat-value">10K+ pts</span>
                            <span className="stat-label">Daily Prize Pool</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">5K+</span>
                            <span className="stat-label">Active Players</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">FREE</span>
                            <span className="stat-label">To Play</span>
                        </div>
                    </div>

                    <div className="hero-actions">
                        {isAuthenticated ? (
                            <Link to="/game" className="btn btn-primary btn-lg">
                                🎮 Play Now
                            </Link>
                        ) : (
                            <>
                                <Link to="/register" className="btn btn-primary btn-lg">
                                    🚀 Start Playing
                                </Link>
                                <Link to="/login" className="btn btn-secondary btn-lg">
                                    Already have an account?
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-it-works container">
                <h2 className="section-title">How It Works</h2>

                <div className="steps-grid">
                    <div className="step-card card">
                        <div className="step-number">01</div>
                        <div className="step-icon">📺</div>
                        <h3>Watch Ad</h3>
                        <p>Watch a short ad to enter the game for free. No payment required!</p>
                    </div>

                    <div className="step-card card">
                        <div className="step-number">02</div>
                        <div className="step-icon">🎮</div>
                        <h3>Play & Compete</h3>
                        <p>Control your snake, eat food to grow, and compete with other players in real-time.</p>
                    </div>

                    <div className="step-card card">
                        <div className="step-number">03</div>
                        <div className="step-icon">💎</div>
                        <h3>Collect Rewards</h3>
                        <p>When players are eliminated, they drop reward orbs. Collect them to increase your earnings!</p>
                    </div>

                    <div className="step-card card">
                        <div className="step-number">04</div>
                        <div className="step-icon">🏆</div>
                        <h3>Win Prizes</h3>
                        <p>Survive 3+ minutes to keep your collected rewards. The longer you survive, the more you can win!</p>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features container">
                <div className="features-grid">
                    <div className="feature-card">
                        <span className="feature-icon">⚡</span>
                        <h3>Real-Time Multiplayer</h3>
                        <p>Compete against hundreds of players in smooth, lag-free matches.</p>
                    </div>

                    <div className="feature-card">
                        <span className="feature-icon">🎁</span>
                        <h3>Free to Play</h3>
                        <p>Watch short ads to play - no deposits or payments required to compete.</p>
                    </div>

                    <div className="feature-card">
                        <span className="feature-icon">💎</span>
                        <h3>Fair Play</h3>
                        <p>3-minute minimum ensures everyone has a fair chance to collect rewards and compete.</p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="cta">
                <div className="container">
                    <h2>Ready to Dominate?</h2>
                    <p>Join thousands of players and start earning today.</p>
                    <Link to="/register" className="btn btn-primary btn-lg">
                        Create Free Account
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <p>© 2026 Snaked! All rights reserved. Play responsibly.</p>
                </div>
            </footer>
        </div>
    )
}

export default Home
