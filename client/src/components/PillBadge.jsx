import './PillBadge.css'

function PillBadge({ children, showDot = false }) {
    return (
        <div className="pill-badge">
            {showDot && <span className="pill-dot"></span>}
            <span className="pill-text">{children}</span>
        </div>
    )
}

export default PillBadge
