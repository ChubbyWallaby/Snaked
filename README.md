# 🐍 Snaked!

A multiplayer snake game where you play for real money. Similar to slither.io, but with a money-based economy.

## Features

- **Real-Time Multiplayer** - Play against other players in smooth, lag-free matches
- **Money Economy** - Deposit real funds, pay per game, collect earnings from defeated players
- **Secure Payments** - Stripe integration for safe transactions
- **10-Minute Rule** - Survive 10 minutes to keep your collected money

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Real-Time**: Socket.io
- **Payments**: Stripe
- **Database**: JSON file storage (PostgreSQL ready)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Stripe account (for payments)

### Installation

1. Clone the repository
```bash
cd Snaked
```

2. Install server dependencies
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your Stripe keys
```

3. Install client dependencies
```bash
cd ../client
npm install
cp .env.example .env
# Edit .env with your Stripe publishable key
```

### Running Locally

1. Start the server
```bash
cd server
npm run dev
```

2. Start the client (in a new terminal)
```bash
cd client
npm run dev
```

3. Open http://localhost:5173 in your browser

## Game Rules

1. **Entry Fee**: Each game costs $0.005
2. **Move**: Control your snake with your mouse
3. **Boost**: Click and hold to boost (burns length)
4. **Eat**: Collect food orbs to grow
5. **Hunt**: When other players die, they drop money orbs
6. **Survive**: Play for 10+ minutes to keep your earnings
7. **Cash Out**: Leave the game after 10 minutes to bank your money

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Wallet
- `GET /api/wallet/balance` - Get balance
- `POST /api/wallet/deposit` - Create Stripe payment
- `POST /api/wallet/deposit-test` - Test deposit (dev only)
- `GET /api/wallet/transactions` - Transaction history

### Game
- `POST /api/game/join` - Join game (deducts fee)
- `POST /api/game/end` - End game (process earnings)
- `GET /api/game/stats` - Player statistics

## Environment Variables

### Server (.env)
```
PORT=3001
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Client (.env)
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## License

MIT
