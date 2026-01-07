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
                        <span className="title-line">SLITHER.</span>
                        <span className="title-line accent">COLLECT.</span>
                        <span className="title-line gold">PROFIT.</span>
                    </h1>

                    <p className="hero-subtitle">
                        The ultimate multiplayer snake game where every bite counts.
                        Deposit real money, eat your opponents, and cash out your winnings!
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
                            <span className="stat-value">50 pts</span>
                            <span className="stat-label">Per Game</span>
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
                        <div className="step-icon">💰</div>
                        <h3>Deposit</h3>
                        <p>Add funds to your account using a credit card. Secure payments powered by Stripe.</p>
                    </div>

                    <div className="step-card card">
                        <div className="step-number">02</div>
                        <div className="step-icon">🎮</div>
                        <h3>Play</h3>
                        <p>Join a game for just 50 pts. Control your snake and eat food to grow bigger.</p>
                    </div>

                    <div className="step-card card">
                        <div className="step-number">03</div>
                        <div className="step-icon">⚔️</div>
                        <h3>Compete</h3>
                        <p>Hunt other players! When they die, they drop their money as collectible orbs.</p>
                    </div>

                    <div className="step-card card">
                        <div className="step-number">04</div>
                        <div className="step-icon">🏆</div>
                        <h3>Cash Out</h3>
                        <p>Survive 10 minutes and keep all the money you collected. Withdraw anytime!</p>
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
                        <span className="feature-icon">🔒</span>
                        <h3>Secure Payments</h3>
                        <p>All transactions are processed securely through Stripe.</p>
                    </div>

                    <div className="feature-card">
                        <span className="feature-icon">💎</span>
                        <h3>Fair Play</h3>
                        <p>10-minute minimum ensures everyone has a fair chance to compete.</p>
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
