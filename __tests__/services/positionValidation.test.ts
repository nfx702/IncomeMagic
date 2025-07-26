import { WheelStrategyAnalyzer } from '@/services/wheelStrategyAnalyzer';
import { IBValidationService } from '@/services/ibValidationService';
import { Trade } from '@/types/trade';

describe('Position Validation System', () => {
  let analyzer: WheelStrategyAnalyzer;
  let validationService: IBValidationService;
  
  // Mock PYPL trades based on actual XML data
  const pyplTrades: Trade[] = [
    {
      // March 4: BUY 35 shares @ $66.55
      accountId: 'U7348945',
      currency: 'USD',
      assetCategory: 'STK',
      symbol: 'PYPL',
      underlyingSymbol: 'PYPL',
      listingExchange: 'NASDAQ',
      quantity: 35,
      tradePrice: 66.55,
      netCash: -2330.25,
      commissionAndTax: -1.00,
      orderType: 'LMT',
      dateTime: new Date('2025-03-04T11:07:51'),
      orderTime: new Date('2025-03-04T11:07:51'),
      openDateTime: new Date('2025-03-04T11:07:51'),
      reportDate: new Date('2025-03-04'),
      tradeDate: new Date('2025-03-04'),
      exchange: 'DRCTEDGE',
      buy_sell: 'BUY',
      multiplier: 1,
      transactionType: 'ExchTrade',
      tradeId: '961029992',
      orderId: '792678111'
    },
    {
      // June 13: BUY 200 shares @ $71 (BookTrade - option assignment)
      accountId: 'U7348945',
      currency: 'USD',
      assetCategory: 'STK',
      symbol: 'PYPL',
      underlyingSymbol: 'PYPL',
      listingExchange: 'NASDAQ',
      quantity: 200,
      tradePrice: 71,
      netCash: -14200,
      commissionAndTax: 0,
      orderType: '',
      dateTime: new Date('2025-06-13'),
      orderTime: new Date('2025-06-13'),
      openDateTime: new Date('2025-06-13'),
      reportDate: new Date('2025-06-13'),
      tradeDate: new Date('2025-06-13'),
      exchange: '--',
      buy_sell: 'BUY',
      multiplier: 1,
      transactionType: 'BookTrade',
      tradeId: '1059661144',
      orderId: '4205017606'
    },
    {
      // June 27: SELL 100 shares @ $73
      accountId: 'U7348945',
      currency: 'USD',
      assetCategory: 'STK',
      symbol: 'PYPL',
      underlyingSymbol: 'PYPL',
      listingExchange: 'NASDAQ',
      quantity: -100,
      tradePrice: 73,
      netCash: 7299.98,
      commissionAndTax: -0.02,
      orderType: '',
      dateTime: new Date('2025-06-27'),
      orderTime: new Date('2025-06-27'),
      openDateTime: new Date('2025-06-27'),
      reportDate: new Date('2025-06-27'),
      tradeDate: new Date('2025-06-27'),
      exchange: '--',
      buy_sell: 'SELL',
      multiplier: 1,
      transactionType: 'BookTrade',
      tradeId: '1072149934',
      orderId: '4264917849'
    },
    {
      // June 27: SELL 100 shares @ $72
      accountId: 'U7348945',
      currency: 'USD',
      assetCategory: 'STK',
      symbol: 'PYPL',
      underlyingSymbol: 'PYPL',
      listingExchange: 'NASDAQ',
      quantity: -100,
      tradePrice: 72,
      netCash: 7199.98,
      commissionAndTax: -0.02,
      orderType: '',
      dateTime: new Date('2025-06-27'),
      orderTime: new Date('2025-06-27'),
      openDateTime: new Date('2025-06-27'),
      reportDate: new Date('2025-06-27'),
      tradeDate: new Date('2025-06-27'),
      exchange: '--',
      buy_sell: 'SELL',
      multiplier: 1,
      transactionType: 'BookTrade',
      tradeId: '1072150074',
      orderId: '4264919575'
    }
  ];
  
  beforeEach(() => {
    analyzer = new WheelStrategyAnalyzer(pyplTrades);
    validationService = IBValidationService.getInstance();
  });
  
  describe('PYPL Position Calculation', () => {
    test('should correctly calculate PYPL position as 35 shares', () => {
      const positions = analyzer.getPositions();
      const pyplPosition = positions.get('PYPL');
      
      expect(pyplPosition).toBeDefined();
      expect(pyplPosition!.quantity).toBe(35);
      expect(pyplPosition!.symbol).toBe('PYPL');
    });
    
    test('should calculate correct average cost', () => {
      const positions = analyzer.getPositions();
      const pyplPosition = positions.get('PYPL');
      
      // Weighted average: (35 * 66.55 + 200 * 71) / 235 = 70.34
      expect(pyplPosition!.averageCost).toBeCloseTo(70.34, 2);
    });
    
    test('should not double-count assigned shares', () => {
      const positions = analyzer.getPositions();
      const pyplPosition = positions.get('PYPL');
      
      // Total bought: 35 + 200 = 235
      // Total sold: 100 + 100 = 200
      // Net position: 235 - 200 = 35 (NOT 100!)
      expect(pyplPosition!.quantity).toBe(35);
    });
  });
  
  describe('Validation Service', () => {
    test('should validate PYPL position against IB data', async () => {
      const positions = analyzer.getPositions();
      const validationReport = await validationService.validateAllPositions(positions);
      
      // Find PYPL validation result
      const pyplValidation = validationReport.results.find(r => r.symbol === 'PYPL');
      
      expect(pyplValidation).toBeDefined();
      expect(pyplValidation!.isValid).toBe(true);
      expect(pyplValidation!.calculatedQuantity).toBe(35);
      expect(pyplValidation!.ibQuantity).toBe(35);
      expect(pyplValidation!.discrepancy).toBe(0);
      expect(pyplValidation!.severity).toBe('ok');
    });
    
    test('should detect discrepancies when positions do not match', async () => {
      // Create a position with wrong quantity
      const wrongPosition = new Map([
        ['PYPL', {
          symbol: 'PYPL',
          quantity: 100, // Wrong! Should be 35
          averageCost: 70.34,
          realizedPnL: 0,
          activeCycles: [],
          completedCycles: []
        }]
      ]);
      
      const validationReport = await validationService.validateAllPositions(wrongPosition);
      const pyplValidation = validationReport.results.find(r => r.symbol === 'PYPL');
      
      expect(pyplValidation!.isValid).toBe(false);
      expect(pyplValidation!.calculatedQuantity).toBe(100);
      expect(pyplValidation!.ibQuantity).toBe(35);
      expect(pyplValidation!.discrepancy).toBe(65);
      expect(pyplValidation!.severity).toBe('critical');
      expect(pyplValidation!.message).toContain('Calculated 100 shares but IB shows only 35');
    });
    
    test('should provide auto-fix suggestions', async () => {
      const wrongPosition = new Map([
        ['PYPL', {
          symbol: 'PYPL',
          quantity: 100,
          averageCost: 70.34,
          realizedPnL: 0,
          activeCycles: [],
          completedCycles: []
        }]
      ]);
      
      const validationReport = await validationService.validateAllPositions(wrongPosition);
      const fixes = await validationService.proposeAutoFix(validationReport);
      
      expect(fixes.has('PYPL')).toBe(true);
      expect(fixes.get('PYPL')).toBe(35); // Should suggest IB quantity
    });
  });
});