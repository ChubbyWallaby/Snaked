# Gaming Compliance Features Implementation Plan

This document outlines the implementation plan for adding gaming compliance and legal features to the Snaked application, including Terms of Service, age verification, geo-blocking, KYC requirements, and responsible gaming settings.

## Current Architecture Summary

- **Frontend**: React + Vite at `client/src/`
- **Backend**: Express.js at `server/`
- **Database**: JSON file-based storage in `server/db/`
- **Auth**: JWT-based authentication with `AuthContext` on client and middleware on server
- **Routing**: React Router with `PrivateRoute` wrapper for protected pages

---

## 1. Terms of Service Page with Gaming Disclaimers

### Overview
Create a dedicated Terms of Service page with gaming-specific legal disclaimers. Link will be accessible from registration and footer.

### Client Changes

#### [NEW] [TermsOfService.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/pages/TermsOfService.jsx)

- Static page component with comprehensive Terms of Service content
- Gaming-specific disclaimers (skill-based gaming, financial risks, etc.)
- Sections: Account, Deposits/Withdrawals, Game Rules, Responsible Gaming, Liability
- Styled with new `TermsOfService.css`

#### [NEW] [TermsOfService.css](file:///Users/ctw03023/Desktop/Snaked/client/src/pages/TermsOfService.css)

- Clean, readable styling for legal content
- Proper heading hierarchy and section spacing

#### [App.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/App.jsx)

- Add route: `/terms` → `<TermsOfService />`

#### [Register.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/pages/Register.jsx)

- Add "I agree to the Terms of Service" checkbox with link to `/terms`
- Require checkbox to be checked before form submission

---

## 2. Age Verification Gate

### Overview
Add mandatory age verification checkbox during registration. Users must confirm they are 18+ (or 21+ depending on jurisdiction).

### Client Changes

#### [Register.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/pages/Register.jsx)

- Add age verification checkbox: "I confirm I am 18 years of age or older"
- Store age confirmation in state
- Validate both ToS and age checkboxes before submission

### Server Changes

#### [auth.js](file:///Users/ctw03023/Desktop/Snaked/server/routes/auth.js)

- Add `ageVerified: true` and `termsAccepted: true` fields to user creation
- Store `termsAcceptedAt` and `ageVerifiedAt` timestamps

#### [index.js](file:///Users/ctw03023/Desktop/Snaked/server/db/index.js)

- User schema now includes:
  - `ageVerified: boolean`
  - `ageVerifiedAt: string (ISO date)`
  - `termsAccepted: boolean`
  - `termsAcceptedAt: string (ISO date)`

---

## 3. Geo-blocking

### Overview
Block users from specific countries (e.g., US restricted states, OFAC-sanctioned countries) based on IP address. Check performed at registration and login.

### Server Changes

#### [NEW] [geoBlock.js](file:///Users/ctw03023/Desktop/Snaked/server/middleware/geoBlock.js)

New middleware that:
- Uses IP geolocation service (ip-api.com or similar free service)
- Blocks configurable list of country codes
- Returns 403 with message for blocked countries
- Includes bypass for local development (localhost IPs)

```javascript
// Blocked countries list (configurable)
const BLOCKED_COUNTRIES = [
  'KP',  // North Korea
  'IR',  // Iran
  'CU',  // Cuba
  'SY',  // Syria
  // Add more as needed
]
```

#### [auth.js](file:///Users/ctw03023/Desktop/Snaked/server/routes/auth.js)

- Apply `geoBlockMiddleware` to `/register` and `/login` routes
- Store `registrationCountry` and `registrationIp` (hashed) in user record for audit

#### [index.js](file:///Users/ctw03023/Desktop/Snaked/server/index.js)

- Ensure `trust proxy` is configured for production deployments behind reverse proxies

---

## 4. KYC Requirement for Withdrawals

### Overview
Require users to upload government ID before their first withdrawal. Documents are stored and marked for admin review.

### Client Changes

#### [NEW] [KYCUpload.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/components/KYCUpload.jsx)

Modal/form component for ID upload:
- File input accepting images (jpg, png) or PDF
- Document type selector (passport, driver's license, national ID)
- Preview before upload
- Status indicator (pending, verified, rejected)

#### [NEW] [KYCUpload.css](file:///Users/ctw03023/Desktop/Snaked/client/src/components/KYCUpload.css)

- Styling for the KYC upload component

#### [Wallet.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/pages/Wallet.jsx)

- Check `user.kycStatus` before allowing withdrawal
- If `kycStatus !== 'verified'`, show KYC upload component instead of withdrawal form
- Display KYC status messages (pending review, rejected with reason, etc.)

### Server Changes

#### [NEW] [kyc.js](file:///Users/ctw03023/Desktop/Snaked/server/routes/kyc.js)

New routes:
- `POST /api/kyc/upload` - Upload KYC document (multipart form data)
- `GET /api/kyc/status` - Get current KYC status
- Store files locally in `server/uploads/kyc/` (in production, use S3 or similar)

#### [wallet.js](file:///Users/ctw03023/Desktop/Snaked/server/routes/wallet.js)

- Add KYC check to `/withdraw` endpoint
- Return 400 with `kycRequired: true` if `kycStatus !== 'verified'`

#### [admin.js](file:///Users/ctw03023/Desktop/Snaked/server/routes/admin.js)

- Add admin routes for KYC review:
  - `GET /api/admin/kyc/pending` - List pending KYC submissions
  - `POST /api/admin/kyc/review` - Approve/reject KYC

#### [index.js](file:///Users/ctw03023/Desktop/Snaked/server/db/index.js)

- User schema additions:
  - `kycStatus: 'none' | 'pending' | 'verified' | 'rejected'`
  - `kycDocumentType: string`
  - `kycDocumentPath: string`
  - `kycSubmittedAt: string`
  - `kycReviewedAt: string`
  - `kycRejectionReason: string`

#### [index.js](file:///Users/ctw03023/Desktop/Snaked/server/index.js)

- Mount KYC routes: `app.use('/api/kyc', kycRoutes)`
- Add multer for file uploads

---

## 5. Responsible Gaming Settings

### Overview
Allow users to set deposit limits and self-exclusion periods to promote responsible gaming.

### Client Changes

#### [NEW] [ResponsibleGaming.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/pages/ResponsibleGaming.jsx)

Dedicated page with:
- **Deposit Limits**: Daily, weekly, monthly limits (user-configurable)
- **Session Time Limits**: Optional reminder after X hours
- **Self-Exclusion**: Temporary (24h, 7d, 30d) or permanent account freeze
- **Reality Check**: Periodic popup showing time/money spent
- Clear warnings about the permanence of self-exclusion

#### [NEW] [ResponsibleGaming.css](file:///Users/ctw03023/Desktop/Snaked/client/src/pages/ResponsibleGaming.css)

- Styling for responsible gaming settings page

#### [App.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/App.jsx)

- Add route: `/responsible-gaming` → `<ResponsibleGaming />` (protected)

#### [Navbar.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/components/Layout/Navbar.jsx)

- Add "Responsible Gaming" link in user dropdown/menu

#### [Wallet.jsx](file:///Users/ctw03023/Desktop/Snaked/client/src/pages/Wallet.jsx)

- Check deposit limits before processing deposits
- Show remaining daily/weekly/monthly deposit allowance

### Server Changes

#### [NEW] [responsibleGaming.js](file:///Users/ctw03023/Desktop/Snaked/server/routes/responsibleGaming.js)

New routes:
- `GET /api/responsible-gaming/settings` - Get current settings
- `PUT /api/responsible-gaming/deposit-limits` - Update deposit limits
- `POST /api/responsible-gaming/self-exclude` - Initiate self-exclusion

#### [wallet.js](file:///Users/ctw03023/Desktop/Snaked/server/routes/wallet.js)

- Check deposit limits in `/deposit` and `/deposit-test` endpoints
- Validate against daily/weekly/monthly caps
- Track deposit totals per period

#### [auth.js](file:///Users/ctw03023/Desktop/Snaked/server/routes/auth.js)

- Check self-exclusion status at login
- Block login if user is self-excluded with message about exclusion end date

#### [index.js](file:///Users/ctw03023/Desktop/Snaked/server/db/index.js)

- User schema additions:
  - `depositLimits: { daily: number, weekly: number, monthly: number }`
  - `selfExcluded: boolean`
  - `selfExclusionEndsAt: string (ISO date or 'permanent')`
  - `selfExclusionReason: string`

#### [index.js](file:///Users/ctw03023/Desktop/Snaked/server/index.js)

- Mount: `app.use('/api/responsible-gaming', responsibleGamingRoutes)`

---

## Verification Plan

### Automated Tests

Since the project doesn't have existing unit tests, verification will be done through:

1. **API Testing with curl/httpie**:
   ```bash
   # Test geo-blocking (use VPN or mock IP headers)
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -H "X-Forwarded-For: 1.2.3.4" \
     -d '{"email":"test@test.com","password":"test123","username":"testuser"}'
   ```

2. **Browser Testing**: Navigate through each flow:
   - Registration with checkboxes
   - Terms of Service page accessibility
   - KYC upload flow
   - Responsible gaming settings
   - Self-exclusion enforcement

### Manual Verification

1. **Terms of Service + Age Verification**:
   - Navigate to `/register`, verify checkboxes are present
   - Attempt to submit without checking → should fail
   - Click ToS link → should navigate to `/terms` page
   - Complete registration with checkboxes → should succeed

2. **Geo-blocking**:
   - Test with local IP (should pass)
   - Modify X-Forwarded-For header with blocked country IP (should fail)
   - Verify appropriate error message displayed

3. **KYC**:
   - Register new user, navigate to Wallet
   - Attempt withdrawal → should prompt for KYC
   - Upload test document → status should be "pending"
   - As admin, review and approve → user can now withdraw

4. **Responsible Gaming**:
   - Set daily deposit limit to $10
   - Attempt to deposit $15 → should fail or be capped
   - Test self-exclusion with 24h period
   - Attempt to login → should be blocked with message

---

## Dependencies

### NPM Packages (Server)

```bash
npm install multer    # For file uploads (KYC)
npm install geoip-lite  # Alternative: For offline IP geolocation (optional)
```

### Environment Variables

Add to `.env`:
```
# Geo-blocking (optional - for custom IP service)
GEO_BLOCK_ENABLED=true
BLOCKED_COUNTRIES=KP,IR,CU,SY

# KYC
KYC_UPLOAD_DIR=./uploads/kyc
```

---

## Implementation Order

1. **Phase 1**: Terms of Service + Age Verification (simplest, foundation)
2. **Phase 2**: Geo-blocking (middleware-based, isolated)
3. **Phase 3**: KYC for Withdrawals (file upload complexity)
4. **Phase 4**: Responsible Gaming (most complex, requires deposit limit tracking)

Each phase can be tested independently before moving to the next.

---

## User Review Required

> [!IMPORTANT]
> Please review and confirm the following before I proceed:

1. **Blocked Countries List**: The default list includes OFAC-sanctioned countries (North Korea, Iran, Cuba, Syria). Do you want to add or remove any countries?

2. **Age Verification Threshold**: Currently set to 18+. Should this be 21+ for certain jurisdictions?

3. **KYC Storage**: For development, I'll store files locally. For production, what storage solution would you prefer (AWS S3, Cloudflare R2, etc.)?

4. **Self-Exclusion Policy**: Should permanent self-exclusion be irreversible (industry standard) or allow admin override?

5. **Deposit Limits**: What should be the default limits (or no default)?
