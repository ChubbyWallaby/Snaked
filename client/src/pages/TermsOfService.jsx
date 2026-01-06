import { useNavigate } from 'react-router-dom'
import './TermsOfService.css'

function TermsOfService() {
    const navigate = useNavigate()

    return (
        <div className="terms-page">
            <div className="terms-container">
                <div className="terms-header">
                    <h1>Terms of Service</h1>
                    <p className="last-updated">Last Updated: January 6, 2026</p>
                </div>

                <div className="terms-content">
                    <section>
                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using Snaked ("the Platform"), you accept and agree to be bound by the terms
                            and provision of this agreement. If you do not agree to these Terms of Service, please do not
                            use the Platform.
                        </p>
                    </section>

                    <section>
                        <h2>2. Age Requirement</h2>
                        <p>
                            You must be at least 18 years of age to use this Platform. By using the Platform, you represent
                            and warrant that you are of legal age to form a binding contract and meet all of the foregoing
                            eligibility requirements. If you do not meet these requirements, you must not access or use the Platform.
                        </p>
                    </section>

                    <section>
                        <h2>3. Account Registration</h2>
                        <p>
                            To access certain features of the Platform, you must register for an account. You agree to:
                        </p>
                        <ul>
                            <li>Provide accurate, current, and complete information during registration</li>
                            <li>Maintain and promptly update your account information</li>
                            <li>Maintain the security of your password and account</li>
                            <li>Accept all responsibility for activities that occur under your account</li>
                            <li>Notify us immediately of any unauthorized use of your account</li>
                        </ul>
                    </section>

                    <section>
                        <h2>4. Gaming Services</h2>
                        <h3>4.1 Skill-Based Gaming</h3>
                        <p>
                            Snaked is a skill-based competitive gaming platform. The outcome of games is determined by
                            player skill, strategy, and decision-making, not by chance. Players compete against each other
                            in real-time multiplayer matches.
                        </p>

                        <h3>4.2 Entry Fees and Prizes</h3>
                        <p>
                            Participation in games may require payment of an entry fee. Prize distributions are based on
                            game performance and are clearly disclosed before entry. All monetary transactions are final
                            unless otherwise specified.
                        </p>

                        <h3>4.3 Game Rules</h3>
                        <p>
                            Players must adhere to the rules of each game. Cheating, exploiting bugs, using unauthorized
                            software, or any form of unfair play is strictly prohibited and may result in account suspension
                            or termination.
                        </p>
                    </section>

                    <section>
                        <h2>5. Financial Terms</h2>
                        <h3>5.1 Deposits</h3>
                        <p>
                            You may deposit funds into your account using approved payment methods. All deposits are subject
                            to verification and anti-fraud checks. We reserve the right to refuse or reverse any deposit.
                        </p>

                        <h3>5.2 Withdrawals</h3>
                        <p>
                            Withdrawals are subject to identity verification (KYC) requirements. First-time withdrawals
                            require submission of government-issued identification. Processing times may vary. Minimum
                            withdrawal amounts and fees may apply.
                        </p>

                        <h3>5.3 Fees</h3>
                        <p>
                            The Platform may charge fees for certain transactions, including but not limited to game entry
                            fees, withdrawal fees, and payment processing fees. All applicable fees will be clearly disclosed
                            before you complete a transaction.
                        </p>
                    </section>

                    <section>
                        <h2>6. Responsible Gaming</h2>
                        <p>
                            We are committed to promoting responsible gaming. We provide tools to help you manage your
                            gaming activity, including:
                        </p>
                        <ul>
                            <li>Deposit limits (daily, weekly, monthly)</li>
                            <li>Session time reminders</li>
                            <li>Self-exclusion options (temporary or permanent)</li>
                            <li>Reality checks showing time and money spent</li>
                        </ul>
                        <p>
                            <strong>Warning:</strong> Gaming involves financial risk. Never wager more than you can afford
                            to lose. If you believe you have a gaming problem, please seek help immediately.
                        </p>
                    </section>

                    <section>
                        <h2>7. Geographic Restrictions</h2>
                        <p>
                            The Platform is not available in all jurisdictions. Access may be restricted based on your
                            location. It is your responsibility to ensure that your use of the Platform complies with
                            applicable local laws. We reserve the right to block access from certain countries or regions.
                        </p>
                    </section>

                    <section>
                        <h2>8. Prohibited Activities</h2>
                        <p>You agree not to:</p>
                        <ul>
                            <li>Use the Platform for any illegal purpose</li>
                            <li>Attempt to manipulate or exploit the Platform's systems</li>
                            <li>Create multiple accounts to circumvent restrictions</li>
                            <li>Engage in collusion or any form of cheating</li>
                            <li>Harass, abuse, or harm other users</li>
                            <li>Use automated systems or bots to access the Platform</li>
                            <li>Reverse engineer or attempt to extract source code</li>
                        </ul>
                    </section>

                    <section>
                        <h2>9. Intellectual Property</h2>
                        <p>
                            All content on the Platform, including but not limited to text, graphics, logos, images, and
                            software, is the property of Snaked or its licensors and is protected by copyright, trademark,
                            and other intellectual property laws.
                        </p>
                    </section>

                    <section>
                        <h2>10. Limitation of Liability</h2>
                        <p>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SNAKED SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED
                            DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                        </p>
                        <p>
                            The Platform is provided "as is" without warranties of any kind. We do not guarantee uninterrupted
                            or error-free operation.
                        </p>
                    </section>

                    <section>
                        <h2>11. Account Suspension and Termination</h2>
                        <p>
                            We reserve the right to suspend or terminate your account at any time for violation of these
                            Terms, suspicious activity, or any other reason at our sole discretion. Upon termination, you
                            may withdraw any remaining balance subject to verification requirements.
                        </p>
                    </section>

                    <section>
                        <h2>12. Dispute Resolution</h2>
                        <p>
                            Any disputes arising from these Terms or your use of the Platform shall be resolved through
                            binding arbitration in accordance with applicable arbitration rules. You waive any right to
                            participate in a class action lawsuit or class-wide arbitration.
                        </p>
                    </section>

                    <section>
                        <h2>13. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these Terms at any time. We will notify users of material changes
                            via email or platform notification. Continued use of the Platform after changes constitutes
                            acceptance of the modified Terms.
                        </p>
                    </section>

                    <section>
                        <h2>14. Contact Information</h2>
                        <p>
                            If you have any questions about these Terms of Service, please contact us at:
                        </p>
                        <p>
                            <strong>Email:</strong> legal@snaked.com<br />
                            <strong>Support:</strong> support@snaked.com
                        </p>
                    </section>

                    <section className="disclaimer-box">
                        <h3>⚠️ Important Disclaimers</h3>
                        <ul>
                            <li><strong>Financial Risk:</strong> Gaming involves financial risk. You may lose money.</li>
                            <li><strong>No Guaranteed Winnings:</strong> Past performance does not guarantee future results.</li>
                            <li><strong>Skill-Based:</strong> Outcomes are determined by skill, not chance.</li>
                            <li><strong>Age Restriction:</strong> Must be 18+ to participate.</li>
                            <li><strong>Responsible Gaming:</strong> Set limits and play responsibly.</li>
                        </ul>
                    </section>
                </div>

                <div className="terms-footer">
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TermsOfService
