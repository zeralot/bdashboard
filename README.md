# Binance Futures Dashboard

A real-time dashboard for monitoring Binance Futures tokens with technical indicators and trading signals.

## Features

- Display top 100 Binance Futures tokens by volume
- Technical indicators (EMA34, EMA89) for multiple timeframes
- Bullish/Bearish pattern detection
- Buy/Sell signals based on volume patterns
- Detailed view for each token with multiple timeframe analysis
- Manual refresh functionality
- Responsive design

## Tech Stack

- Frontend: React.js with modern hooks
- Backend: Node.js with Express
- API: Binance Futures API
- Styling: Tailwind CSS

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd binance_dashboard
```

2. Install dependencies for both frontend and backend:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Start the application:

```bash
# Start backend (from backend directory)
npm start

# Start frontend (from frontend directory)
npm start
```

The backend will run on port 4000 and the frontend will run on port 3000 by default.

## Usage

- View the dashboard at `http://localhost:3000`
- Use filter buttons to view specific token patterns:
  - All: Show all tokens
  - Bullish: Show tokens above both EMAs
  - Bearish: Show tokens below both EMAs
  - Should Buy: Show tokens with buy signals
  - Should Sell: Show tokens with sell signals
- Click "Show" to view detailed timeframe analysis for each token
- Use the refresh button to manually update data

## API Endpoints

- `GET /api/tokens`: Fetch top 100 tokens with technical indicators

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

## 📖 Table of Contents

1. [Features](#-features)  
2. [Prerequisites](#-prerequisites)  
3. [Project Structure](#-project-structure)  
4. [Installation & Usage](#-installation--usage)  
   - [Backend Setup](#backend-setup)  
   - [Frontend Setup](#frontend-setup)  
5. [Configuration](#-configuration)  
6. [How It Works](#-how-it-works)  
7. [Customization](#-customization)  
8. [Troubleshooting](#-troubleshooting)  
9. [Contributing](#-contributing)  
10. [License](#-license)  
11. [Author](#-author)  

---

## 🚀 Features

### Core Features
- **Top 1000 Futures Tokens** filtered by 24h USDT volume
- **Real-time Price Updates**
- **Smart Filtering System**:
  - Filter by Bullish tokens (green)
  - Filter by Bearish tokens (red)
  - View all tokens
- **EMA Indicators** (34 & 89) across multiple timeframes:
  - 5 minutes (5m)
  - 15 minutes (15m)
  - 1 hour (1h)
  - 4 hours (4h)
  - 1 day (1d)
- **Infinite Scroll** with pagination
- **Expandable Details** per token
- **Direct Links** to Binance's trading page

### Trading Signals

#### Color Coding
- **Green Background**: Token is bullish when price is above both EMA34 & EMA89 on 15m, 1h, and 4h timeframes
- **Red Background**: Token is bearish when price is below both EMA34 & EMA89 on 15m, 1h, and 4h timeframes

#### Volume Pattern Signals
The dashboard implements specific volume pattern detection for potential trade signals:

**Buy Signal (For Green/Bullish Tokens)**
- Last 3 candles on M15 timeframe must be: RED → GREEN → GREEN
- Volume must be increasing: V1 < V2 < V3
- When pattern matches, displays "Should Buy" in green

**Sell Signal (For Red/Bearish Tokens)**
- Last 3 candles on M15 timeframe must be: GREEN → RED → RED
- Volume must be increasing: V1 < V2 < V3
- When pattern matches, displays "Should Sell" in red

### Filtering System
The dashboard includes a smart filtering system that allows users to:
- View only bullish tokens (green background)
- View only bearish tokens (red background)
- View all tokens without filtering
This helps traders focus on specific market conditions and potential trading opportunities.

---

## 📋 Prerequisites

- **Node.js** v16+ and **npm**
- Internet access for Binance API calls
- (Optional) Git for version control

---

## 🗂 Project Structure


## 🛠️ Installation & Setup

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node app.js
   ```
   Server will run on http://localhost:4000

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
   Frontend will run on http://localhost:5173

## 🔄 How It Works

### Backend Logic
1. **Data Fetching**:
   - Fetches futures market data from Binance FAPI
   - Implements caching (1-minute TTL) to reduce API calls
   - Processes top 1000 USDT pairs by volume

2. **Technical Analysis**:
   - Calculates EMA34 and EMA89 for multiple timeframes
   - Tracks last 3 candles on M15 for volume pattern analysis
   - Processes candle colors (green/red) based on close vs open

### Frontend Logic
1. **Display Logic**:
   - Shows tokens in a paginated table (20 items per page)
   - Implements infinite scroll for smooth navigation
   - Color codes rows based on EMA positions

2. **Signal Generation**:
   - Analyzes token data for specific volume patterns
   - Displays buy/sell signals based on volume and price action
   - Updates signals in real-time with data refresh

## 🔧 Configuration

### Backend Configuration
- Server Port: 4000 (configurable in app.js)
- Cache Duration: 60 seconds (configurable in binanceService.js)
- Items Per Page: 20 (configurable in app.js)

### Frontend Configuration
- Default Page Size: 20 items
- Auto-refresh: Manual (via Refresh button)
- Scroll Threshold: 1.2x viewport height

## 🚨 Trading Disclaimer

This tool is for informational purposes only. The signals and patterns it identifies should not be considered as financial advice. Always:
- Do your own research (DYOR)
- Use proper risk management
- Consider multiple factors before trading
- Never trade with money you can't afford to lose

## 📝 License

MIT License - feel free to use and modify as needed.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

