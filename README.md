# IncomeMagic - Options Trading Dashboard

A comprehensive options trading dashboard designed for wheel strategy traders. Analyzes Interactive Brokers trade data to provide insights, calculate safe strike prices, and generate AI-powered trade recommendations.

## Features

- 🎯 **Wheel Strategy Analysis**: Automatically detects trading cycles, calculates P&L, and tracks active positions
- 💰 **Safe Strike Calculation**: Computes break-even prices for assigned positions including all premiums collected
- 📊 **Income Analytics**: Breaks down income by symbol, week, and month with drill-down capabilities
- 🤖 **Trade Recommendations**: AI-powered suggestions targeting $1300 weekly premium income
- 📈 **Real-time Market Data**: Integration with Alpaca API for quotes and historical data
- ✨ **Beautiful UI**: Liquid glass effects, 4 color themes (light, dark, maya, magic), and smooth animations
- ✅ **Position Validation**: Validates calculated positions against IB API data to detect discrepancies

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS with glassmorphism design
- **Data Visualization**: D3.js, Recharts
- **Testing**: Jest, Playwright
- **APIs**: Alpaca (market data), Interactive Brokers (trade data)

## Getting Started

1. Clone the repository
```bash
git clone [repository-url]
cd income-magic
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. Run the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm run start

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Lint
npm run lint
```

## Project Structure

```
income-magic/
├── src/
│   ├── app/              # Next.js 13+ app directory
│   ├── components/       # React components
│   ├── services/         # Business logic and external APIs
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions
├── __tests__/           # Unit tests
├── tests/               # E2E tests
└── docs/                # Documentation
```

## Key Components

- **WheelStrategyAnalyzer**: Detects and analyzes wheel strategy cycles
- **IBValidationService**: Validates positions against IB API data
- **PositionValidation**: UI component for displaying validation results
- **RadialMultilayerChart**: D3.js visualization for options data

## Recent Updates

- Fixed PYPL position calculation (was showing 100, now correctly shows 35 shares)
- Implemented position validation system with IB API integration
- Added glassmorphism UI with 4 beautiful themes
- Created comprehensive test suite with unit and E2E tests

## License

MIT