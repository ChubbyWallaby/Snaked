import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PillBadge from '../components/PillBadge'
import './Home.css'

function Home() {
    const { isAuthenticated } = useAuth()

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <PillBadge showDot>
                        Watch ads. Chase orbs. Win real money.
                    </PillBadge>

                    <h1 className="hero-title">
                        Compete for <span className="highlight-sage">Money Orbs</span>
                    </h1>

                    <p className="hero-subtitle">
                        A multiplayer arena where ad revenue becomes your reward. Watch, play, and collect orbs to earn real money.
                    </p>

                    <div className="hero-actions">
                        {isAuthenticated ? (
                            <>
                                <Link to="/game" className="btn btn-primary btn-lg">
                                    Start Playing Free
                                </Link>
                                <Link to="/dashboard" className="btn btn-secondary btn-lg">
                                    Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/register" className="btn btn-primary btn-lg">
                                    Start Playing Free
                                </Link>
                                <Link to="/login" className="btn btn-secondary btn-lg">
                                    I Have an Account
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
                    <div className="step-card">
                        <div className="step-icon-circle">
                            <span className="step-icon">📺</span>
                        </div>
                        <h3>Watch Ads</h3>
                        <p>Watch a short ad to unlock entry into the game. Prize pool increases with each ad.</p>
                    </div>

                    <div className="step-card">
                        <div className="step-icon-circle">
                            <span className="step-icon">🎮</span>
                        </div>
                        <h3>Chase Orbs</h3>
                        <p>Compete in real-time with other players. Collect orbs and grow your snake to dominate the arena.</p>
                    </div>

                    <div className="step-card">
                        <div className="step-icon-circle">
                            <span className="step-icon">💰</span>
                        </div>
                        <h3>Win Rewards</h3>
                        <p>survive 3+ minutes to cash out your collected rewards. The longer you survive, the more you earn!</p>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features container">
                <div className="features-grid">
                    <div className="feature-card">
                        <span className="feature-icon">⚡</span>
                        <h3>Real-Time</h3>
                        <p>Smooth multiplayer action</p>
                    </div>

                    <div className="feature-card">
                        <span className="feature-icon">🎁</span>
                        <h3>Free to Play</h3>
                        <p>Watch ads to compete</p>
                    </div>

                    <div className="feature-card">
                        <span className="feature-icon">💎</span>
                        <h3>Fair Rewards</h3>
                        <p>3-min survival minimum</p>
                    </div>

                    <div className="feature-card">
                        <span className="feature-icon">🌍</span>
                        <h3>Global Arena</h3>
                        <p>Play with thousands</p>
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
