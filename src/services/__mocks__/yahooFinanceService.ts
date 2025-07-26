// Mock Yahoo Finance Service for testing
export const fetchOptionsChain = jest.fn().mockResolvedValue({
  symbol: 'AAPL',
  expirations: ['2024-02-16', '2024-02-23', '2024-03-01'],
  calls: [
    {
      strike: 180,
      bid: 5.20,
      ask: 5.30,
      volume: 1000,
      openInterest: 5000,
      impliedVolatility: 0.25
    },
    {
      strike: 185,
      bid: 3.10,
      ask: 3.20,
      volume: 800,
      openInterest: 4000,
      impliedVolatility: 0.24
    }
  ],
  puts: [
    {
      strike: 175,
      bid: 4.50,
      ask: 4.60,
      volume: 1200,
      openInterest: 6000,
      impliedVolatility: 0.26
    },
    {
      strike: 170,
      bid: 2.80,
      ask: 2.90,
      volume: 900,
      openInterest: 3500,
      impliedVolatility: 0.27
    }
  ]
});

export const getQuote = jest.fn().mockResolvedValue({
  symbol: 'AAPL',
  price: 180.50,
  change: 2.30,
  changePercent: 1.29,
  volume: 50000000,
  marketCap: 2800000000000,
  dayHigh: 182.00,
  dayLow: 178.50
});

export const getHistoricalData = jest.fn().mockResolvedValue([
  { date: new Date('2024-01-01'), close: 175.00 },
  { date: new Date('2024-01-02'), close: 176.50 },
  { date: new Date('2024-01-03'), close: 178.00 },
  { date: new Date('2024-01-04'), close: 180.50 }
]);