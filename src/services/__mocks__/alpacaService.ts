// Mock Alpaca Service for testing
export class AlpacaService {
  private static instance: AlpacaService;
  private mockConfigured: boolean = true; // Default to configured
  
  static getInstance(): AlpacaService {
    if (!this.instance) {
      this.instance = new AlpacaService();
    }
    return this.instance;
  }
  
  // Test helper method to simulate configuration state
  __setMockConfigured(configured: boolean): void {
    this.mockConfigured = configured;
  }

  async getQuote(symbol: string) {
    return {
      symbol,
      bidPrice: 100 + Math.random() * 10,
      askPrice: 101 + Math.random() * 10,
      lastPrice: 100.5 + Math.random() * 10,
      bidSize: 100,
      askSize: 100,
      volume: 1000000,
      timestamp: new Date()
    };
  }

  async getHistoricalData(symbol: string, start: Date, end: Date, timeframe: string) {
    const data = [];
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      
      data.push({
        timestamp: date,
        open: 100 + Math.random() * 10,
        high: 105 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
        volume: Math.floor(1000000 + Math.random() * 500000)
      });
    }
    
    return data;
  }

  async subscribeToQuotes(symbols: string[], callback: Function) {
    // Simulate real-time quotes
    const interval = setInterval(() => {
      symbols.forEach(symbol => {
        callback({
          symbol,
          price: 100 + Math.random() * 10,
          timestamp: new Date()
        });
      });
    }, 5000);

    return () => clearInterval(interval);
  }

  async getMarketStatus() {
    const now = new Date();
    const hours = now.getHours();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isMarketHours = hours >= 9 && hours < 16;
    
    return {
      isOpen: isWeekday && isMarketHours,
      nextOpen: new Date(),
      nextClose: new Date()
    };
  }

  isApiConfigured(): boolean {
    // Use the mock configuration state
    return this.mockConfigured;
  }

  clearCache(): void {
    // Mock implementation
  }

  getCacheStats() {
    return {
      size: 0,
      entries: []
    };
  }
}

// Export singleton instance for default export compatibility
const alpacaService = AlpacaService.getInstance();
export default alpacaService;