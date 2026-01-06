import { useState, useEffect } from 'react'
import axios from 'axios'
import './Admin.css'

function Admin() {
    const [withdrawals, setWithdrawals] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [processingId, setProcessingId] = useState(null)

    useEffect(() => {
        fetchWithdrawals()
    }, [])

    const fetchWithdrawals = async () => {
        try {
            const { data } = await axios.get('/api/admin/withdrawals')
            setWithdrawals(data.withdrawals)
        } catch (err) {
            setError('Failed to load withdrawals')
            console.error(err)
        }
        setLoading(false)
    }

    const handleApprove = async (id) => {
        setProcessingId(id)
        try {
            const { data } = await axios.post(`/api/admin/withdrawals/${id}/approve`)
            if (data.message) {
                alert(data.message)
            }
            await fetchWithdrawals()
        } catch (err) {
            alert(err.response?.data?.message || 'Approval failed')
        }
        setProcessingId(null)
    }

    const handleReject = async (id) => {
        setProcessingId(id)
        try {
            await axios.post(`/api/admin/withdrawals/${id}/reject`)
            await fetchWithdrawals()
        } catch (err) {
            alert('Rejection failed')
        }
        setProcessingId(null)
    }

    if (loading) return <div className="page container">Loading Admin Dashboard...</div>

    const pending = withdrawals.filter(w => w.status === 'pending')
    const completed = withdrawals.filter(w => w.status !== 'pending')

    return (
        <div className="admin-page page">
            <div className="container">
                <header className="admin-header">
                    <h1>Admin Dashboard</h1>
                    <p className="subtitle">Manage Withdrawal Fulfillment</p>
                </header>

                {error && <div className="error-message">{error}</div>}

                <section className="admin-section card">
                    <h2>Pending Requests ({pending.length})</h2>
                    {pending.length === 0 ? (
                        <p className="no-data">No pending requests</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>User</th>
                                        <th>Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pending.map(w => (
                                        <tr key={w.id}>
                                            <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                                            <td>{w.username}</td>
                                            <td className="money-negative">-${Math.abs(w.amount).toFixed(2)}</td>
                                            <td className="actions">
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    disabled={processingId === w.id}
                                                    onClick={() => handleApprove(w.id)}
                                                >
                                                    {processingId === w.id ? '...' : 'Approve'}
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    disabled={processingId === w.id}
                                                    onClick={() => handleReject(w.id)}
                                                >
                                                    Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="admin-section card history">
                    <h2>History</h2>
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>User</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {completed.map(w => (
                                    <tr key={w.id} className={`row-${w.status}`}>
                                        <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                                        <td>{w.username}</td>
                                        <td>${Math.abs(w.amount).toFixed(2)}</td>
                                        <td>
                                            <span className={`status-badge status-${w.status}`}>
                                                {w.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default Admin
