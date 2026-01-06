import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import './Wallet.css'

// Initialize Stripe - Replace with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

const DEPOSIT_AMOUNTS = [
    { value: 5, label: '$5' },
    { value: 10, label: '$10' },
    { value: 20, label: '$20' },
    { value: 50, label: '$50' },
]

function DepositForm({ onSuccess }) {
    const stripe = useStripe()
    const elements = useElements()
    const [amount, setAmount] = useState(10)
    const [customAmount, setCustomAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!stripe || !elements) return

        setLoading(true)
        setError('')

        const depositAmount = customAmount ? parseFloat(customAmount) : amount

        if (depositAmount < 1) {
            setError('Minimum deposit is $1')
            setLoading(false)
            return
        }

        try {
            // Create payment intent on backend
            const { data } = await axios.post('/api/wallet/deposit', {
                amount: depositAmount
            })

            // Confirm payment with Stripe
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
                data.clientSecret,
                {
                    payment_method: {
                        card: elements.getElement(CardElement),
                    }
                }
            )

            if (stripeError) {
                setError(stripeError.message)
            } else if (paymentIntent.status === 'succeeded') {
                // Manually confirm with backend to update balance immediately (since webhooks might be delayed/blocked on localhost)
                try {
                    await axios.post('/api/wallet/confirm-deposit', {
                        paymentIntentId: paymentIntent.id
                    })
                } catch (confirmError) {
                    console.error('Backend confirmation failed:', confirmError)
                    // Continue anyway, as webhook might handle it eventually, or user can refresh
                }

                onSuccess(depositAmount)
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Payment failed')
        }

        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="deposit-form">
            <div className="amount-selection">
                <label>Select Amount</label>
                <div className="amount-buttons">
                    {DEPOSIT_AMOUNTS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`amount-btn ${amount === opt.value && !customAmount ? 'active' : ''}`}
                            onClick={() => { setAmount(opt.value); setCustomAmount('') }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="custom-amount">
                    <input
                        type="number"
                        placeholder="Custom amount"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="input"
                        min="1"
                        step="0.01"
                    />
                </div>
            </div>

            <div className="card-input">
                <label>Card Details</label>
                <div className="card-element-wrapper">
                    <CardElement
                        options={{
                            hidePostalCode: true,
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: '#ffffff',
                                    '::placeholder': { color: 'rgba(255,255,255,0.4)' },
                                },
                            }
                        }}
                    />
                </div>
            </div>

            {error && (
                <div className="deposit-error">
                    {error}
                    {error.includes('Use /api/wallet/deposit-test') && (
                        <p className="error-hint">Scroll down to use Test Deposit Mode instead.</p>
                    )}
                </div>
            )}

            <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={!stripe || loading}
            >
                {loading ? 'Processing...' : `Deposit $${customAmount || amount}`}
            </button>

            <p className="secure-note">
                🔒 Payments secured by Stripe
            </p>
        </form>
    )
}

function WithdrawalForm({ balance, stripeOnboardingComplete, onSuccess }) {
    const { refreshUser } = useAuth()
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [onboardingLoading, setOnboardingLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')

    const handleOnboarding = async () => {
        setOnboardingLoading(true)
        setError('')
        try {
            const { data } = await axios.get('/api/wallet/onboarding-link')
            window.location.href = data.url
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to start onboarding'
            // Add a more helpful hint if it's a Connect setup error
            if (msg.includes('signed up for Connect')) {
                setError('Stripe Connect is not enabled on this account. Please enable it in the Stripe Dashboard.')
            } else {
                setError(msg)
            }
            setOnboardingLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await refreshUser()
        setRefreshing(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!stripeOnboardingComplete) {
            handleOnboarding()
            return
        }

        setLoading(true)
        setError('')

        const withdrawAmount = parseFloat(amount)
        if (isNaN(withdrawAmount) || withdrawAmount < 1) {
            setError('Minimum withdrawal is $1.00')
            setLoading(false)
            return
        }

        if (withdrawAmount > balance) {
            setError('Insufficient balance')
            setLoading(false)
            return
        }

        try {
            await axios.post('/api/wallet/withdraw', { amount: withdrawAmount })
            onSuccess(withdrawAmount)
            setAmount('')
        } catch (err) {
            setError(err.response?.data?.message || 'Withdrawal failed')
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="withdrawal-form">
            <div className={`input-group ${!stripeOnboardingComplete ? 'locked' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <label style={{ marginBottom: 0 }}>Withdrawal Amount</label>
                    {!stripeOnboardingComplete && (
                        <button
                            type="button"
                            className="btn-text"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            style={{ fontSize: '0.8rem', opacity: 0.8 }}
                        >
                            {refreshing ? 'Refreshing...' : 'Refresh Status'}
                        </button>
                    )}
                </div>
                <div className="amount-input-wrapper">
                    <span className="currency-prefix">$</span>
                    <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="input"
                        min="1"
                        step="0.01"
                        required={stripeOnboardingComplete}
                        disabled={!stripeOnboardingComplete}
                    />
                </div>
                {!stripeOnboardingComplete ? (
                    <p className="hint onboarding-hint">🔒 Set up bank details below to enable withdrawals.</p>
                ) : (
                    <p className="hint">Funds will be transferred directly to your bank account via Stripe.</p>
                )}
            </div>

            {error && <div className="withdraw-error">{error}</div>}

            {!stripeOnboardingComplete ? (
                <button
                    type="button"
                    className="btn btn-secondary btn-lg"
                    onClick={handleOnboarding}
                    disabled={onboardingLoading}
                >
                    {onboardingLoading ? 'Redirecting to Stripe...' : 'Setup Payouts'}
                </button>
            ) : (
                <button
                    type="submit"
                    className="btn btn-secondary btn-lg"
                    disabled={loading || !amount}
                >
                    {loading ? 'Processing Transfer...' : 'Withdraw to Bank'}
                </button>
            )}

            {!stripeOnboardingComplete && (
                <p className="secure-note" style={{ marginTop: 'var(--space-md)' }}>
                    Standard one-time setup via Stripe Express required for payouts.
                </p>
            )}
        </form>
    )
}

function TestDepositForm({ onSuccess }) {
    const [amount, setAmount] = useState(100)
    const [loading, setLoading] = useState(false)

    const handleTestDeposit = async () => {
        setLoading(true)
        try {
            await axios.post('/api/wallet/deposit-test', { amount })
            onSuccess(amount)
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

    return (
        <div className="test-deposit-box">
            <h3>🧪 Developer / Test Mode</h3>
            <p>Add fake funds to test the game without a credit card.</p>
            <div className="test-actions">
                <button
                    className="btn btn-secondary"
                    onClick={handleTestDeposit}
                    disabled={loading}
                >
                    {loading ? 'Adding...' : `Add +$${amount} (Test Funds)`}
                </button>
            </div>
        </div>
    )
}

function Wallet() {
    const { user, refreshBalance, refreshUser } = useAuth()
    const [transactions, setTransactions] = useState([])
    const [loadingTx, setLoadingTx] = useState(true)
    const [successMessage, setSuccessMessage] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        // Check for onboarding success in URL
        const params = new URLSearchParams(window.location.search)
        if (params.get('onboarding') === 'success') {
            setSuccessMessage('Payout setup complete! You can now withdraw funds.')
            // Clear URL params
            window.history.replaceState({}, '', window.location.pathname)
            // Refresh user to get stripeOnboardingComplete status
            refreshUser()
        }
        fetchTransactions()
    }, [])

    const fetchTransactions = async () => {
        try {
            const { data } = await axios.get('/api/wallet/transactions')
            setTransactions(data.transactions || [])
        } catch (err) {
            console.error('Failed to fetch transactions:', err)
        }
        setLoadingTx(false)
    }

    const handleDepositSuccess = async (amount) => {
        setSuccessMessage(`Successfully deposited $${amount}!`)
        await refreshBalance()
        await fetchTransactions()
        setTimeout(() => setSuccessMessage(''), 5000)
    }

    const handleWithdrawalSuccess = async (amount) => {
        setSuccessMessage(`Withdrawal of $${amount} processed successfully!`)
        await refreshBalance()
        await fetchTransactions()
        setTimeout(() => setSuccessMessage(''), 5000)
    }

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'deposit': return '💰'
            case 'game_fee': return '🎮'
            case 'earnings': return '🏆'
            case 'loss': return '💀'
            case 'withdrawal': return '💸'
            default: return '📝'
        }
    }

    const getTransactionClass = (type) => {
        return type === 'deposit' || type === 'earnings' ? 'money-positive' : 'money-negative'
    }

    return (
        <div className="wallet-page page">
            <div className="container">
                <header className="wallet-header">
                    <h1>Wallet</h1>
                    <div className="current-balance">
                        <span className="balance-label">Current Balance</span>
                        <span className="balance-value money">${(user?.balance || 0).toFixed(2)}</span>
                    </div>
                </header>

                {successMessage && (
                    <div className="success-message">{successMessage}</div>
                )}

                <div className="wallet-grid">
                    {/* Deposit Section */}
                    <section className="wallet-section deposit-section card">
                        <h2>Add Funds</h2>
                        <Elements stripe={stripePromise}>
                            <DepositForm onSuccess={handleDepositSuccess} />
                        </Elements>

                        <div className="separator">
                            <span>OR</span>
                        </div>

                        <TestDepositForm onSuccess={handleDepositSuccess} />
                    </section>

                    {/* Withdrawal Section */}
                    <section className="wallet-section withdraw-section card">
                        <h2>Withdraw Funds</h2>
                        <WithdrawalForm
                            balance={user?.balance || 0}
                            stripeOnboardingComplete={user?.stripeOnboardingComplete}
                            onSuccess={handleWithdrawalSuccess}
                        />
                    </section>

                    {/* Transaction History */}
                    <section className="wallet-section transactions-section card">
                        <h2>Transaction History</h2>
                        {loadingTx ? (
                            <div className="loading">Loading transactions...</div>
                        ) : transactions.length === 0 ? (
                            <div className="no-transactions">
                                <p>No transactions yet</p>
                                <p className="hint">Make your first deposit to start playing!</p>
                            </div>
                        ) : (
                            <ul className="transaction-list">
                                {transactions.map((tx) => (
                                    <li key={tx.id} className="transaction-item">
                                        <span className="tx-icon">{getTransactionIcon(tx.type)}</span>
                                        <div className="tx-details">
                                            <span className="tx-type">{tx.type.replace('_', ' ')}</span>
                                            <span className="tx-date">
                                                {new Date(tx.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <span className={`tx-amount ${getTransactionClass(tx.type)}`}>
                                            {tx.type === 'deposit' || tx.type === 'earnings' ? '+' : '-'}
                                            ${Math.abs(tx.amount).toFixed(2)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </div>
    )
}

export default Wallet
