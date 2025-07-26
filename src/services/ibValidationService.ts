import { Position } from '@/types/trade';

export interface IBPosition {
  symbol: string;
  quantity: number;
  averageCost: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  account: string;
}

export interface ValidationResult {
  symbol: string;
  isValid: boolean;
  calculatedQuantity: number;
  ibQuantity: number;
  discrepancy: number;
  discrepancyPercentage: number;
  severity: 'critical' | 'warning' | 'minor' | 'ok';
  message: string;
  suggestions: string[];
}

export interface ValidationReport {
  timestamp: Date;
  totalPositions: number;
  validPositions: number;
  invalidPositions: number;
  criticalErrors: number;
  warnings: number;
  results: ValidationResult[];
}

export class IBValidationService {
  private static instance: IBValidationService;
  private mockIBPositions: Map<string, IBPosition>;
  private isConnected: boolean = false;

  private constructor() {
    // Initialize with mock IB data for testing
    this.mockIBPositions = new Map([
      ['PYPL', {
        symbol: 'PYPL',
        quantity: 35, // Actual PYPL position: 235 bought - 200 sold = 35 shares
        averageCost: 70.34, // Weighted average from trades
        marketValue: 2512, // 35 shares * ~$71.85 current price
        unrealizedPnL: 50,
        realizedPnL: 299.95, // From the 200 shares sold
        account: 'U7348945' // Actual account from XML
      }],
      ['AAPL', {
        symbol: 'AAPL',
        quantity: 100,
        averageCost: 175.50,
        marketValue: 18500,
        unrealizedPnL: 1000,
        realizedPnL: 500,
        account: 'U12345678'
      }],
      ['TSLA', {
        symbol: 'TSLA',
        quantity: 200,
        averageCost: 180.25,
        marketValue: 40000,
        unrealizedPnL: 3950,
        realizedPnL: 1200,
        account: 'U12345678'
      }]
    ]);
  }

  static getInstance(): IBValidationService {
    if (!IBValidationService.instance) {
      IBValidationService.instance = new IBValidationService();
    }
    return IBValidationService.instance;
  }

  /**
   * Connect to IB API (mock implementation)
   */
  async connect(): Promise<boolean> {
    try {
      // In production, this would connect to actual IB Gateway/TWS
      console.log('🔌 Connecting to IB API for validation...');
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isConnected = true;
      console.log('✅ Connected to IB API');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to IB API:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Fetch positions from IB API
   */
  async fetchIBPositions(): Promise<Map<string, IBPosition>> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // In production, this would fetch from actual IB API
      console.log('📊 Fetching positions from IB API...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add some dynamic data to simulate real-time updates
      const updatedPositions = new Map(this.mockIBPositions);
      
      // Add SPY position that might not be in calculations
      updatedPositions.set('SPY', {
        symbol: 'SPY',
        quantity: 300,
        averageCost: 420.50,
        marketValue: 135000,
        unrealizedPnL: 8850,
        realizedPnL: 2500,
        account: 'U12345678'
      });

      console.log(`✅ Fetched ${updatedPositions.size} positions from IB`);
      return updatedPositions;
    } catch (error) {
      console.error('❌ Error fetching IB positions:', error);
      throw error;
    }
  }

  /**
   * Validate a single position against IB data
   */
  validatePosition(calculatedPosition: Position, ibPosition: IBPosition | undefined): ValidationResult {
    const symbol = calculatedPosition.symbol;
    
    // If no IB position exists
    if (!ibPosition) {
      if (calculatedPosition.quantity > 0) {
        return {
          symbol,
          isValid: false,
          calculatedQuantity: calculatedPosition.quantity,
          ibQuantity: 0,
          discrepancy: calculatedPosition.quantity,
          discrepancyPercentage: 100,
          severity: 'critical',
          message: `Position shows ${calculatedPosition.quantity} shares but IB shows NO position`,
          suggestions: [
            'Check if trades were properly imported',
            'Verify if position was closed in IB but not reflected in trades',
            'Ensure all XML files are up to date'
          ]
        };
      } else {
        return {
          symbol,
          isValid: true,
          calculatedQuantity: 0,
          ibQuantity: 0,
          discrepancy: 0,
          discrepancyPercentage: 0,
          severity: 'ok',
          message: 'No position in calculations or IB',
          suggestions: []
        };
      }
    }

    // Calculate discrepancy
    const discrepancy = Math.abs(calculatedPosition.quantity - ibPosition.quantity);
    const discrepancyPercentage = ibPosition.quantity > 0 
      ? (discrepancy / ibPosition.quantity) * 100 
      : discrepancy > 0 ? 100 : 0;

    // Determine severity
    let severity: ValidationResult['severity'] = 'ok';
    if (discrepancy > 0) {
      if (discrepancyPercentage >= 100 || discrepancy >= 100) {
        severity = 'critical';
      } else if (discrepancyPercentage >= 10 || discrepancy >= 10) {
        severity = 'warning';
      } else {
        severity = 'minor';
      }
    }

    // Generate message and suggestions
    let message = '';
    const suggestions: string[] = [];

    if (discrepancy === 0) {
      message = 'Position matches IB exactly';
    } else if (calculatedPosition.quantity > ibPosition.quantity) {
      message = `Calculated ${calculatedPosition.quantity} shares but IB shows only ${ibPosition.quantity}`;
      suggestions.push(
        'Check for duplicate trades in XML files',
        'Verify all SELL trades were properly recorded',
        'Look for corporate actions (splits, dividends) not reflected'
      );
    } else {
      message = `Calculated ${calculatedPosition.quantity} shares but IB shows ${ibPosition.quantity}`;
      suggestions.push(
        'Check for missing trades in XML export',
        'Verify date range of XML export covers all trades',
        'Look for manual adjustments in IB not captured'
      );
    }

    return {
      symbol,
      isValid: severity === 'ok' || severity === 'minor',
      calculatedQuantity: calculatedPosition.quantity,
      ibQuantity: ibPosition.quantity,
      discrepancy,
      discrepancyPercentage,
      severity,
      message,
      suggestions
    };
  }

  /**
   * Validate all positions against IB data
   */
  async validateAllPositions(calculatedPositions: Map<string, Position>): Promise<ValidationReport> {
    try {
      const ibPositions = await this.fetchIBPositions();
      const results: ValidationResult[] = [];
      const processedSymbols = new Set<string>();

      // Validate calculated positions
      for (const [symbol, position] of calculatedPositions) {
        const ibPosition = ibPositions.get(symbol);
        const result = this.validatePosition(position, ibPosition);
        results.push(result);
        processedSymbols.add(symbol);
      }

      // Check for positions in IB but not in calculations
      for (const [symbol, ibPosition] of ibPositions) {
        if (!processedSymbols.has(symbol) && ibPosition.quantity > 0) {
          results.push({
            symbol,
            isValid: false,
            calculatedQuantity: 0,
            ibQuantity: ibPosition.quantity,
            discrepancy: ibPosition.quantity,
            discrepancyPercentage: 100,
            severity: 'warning',
            message: `IB shows ${ibPosition.quantity} shares but no trades found in calculations`,
            suggestions: [
              'Check if XML export includes all accounts',
              'Verify trades for this symbol were imported',
              'Position may have been opened before export date range'
            ]
          });
        }
      }

      // Sort results by severity
      results.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, minor: 2, ok: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      // Generate report
      const report: ValidationReport = {
        timestamp: new Date(),
        totalPositions: results.length,
        validPositions: results.filter(r => r.isValid).length,
        invalidPositions: results.filter(r => !r.isValid).length,
        criticalErrors: results.filter(r => r.severity === 'critical').length,
        warnings: results.filter(r => r.severity === 'warning').length,
        results
      };

      return report;
    } catch (error) {
      console.error('Error validating positions:', error);
      throw error;
    }
  }

  /**
   * Get reconciliation suggestions for fixing discrepancies
   */
  getReconciliationSteps(result: ValidationResult): string[] {
    const steps: string[] = [];

    if (result.severity === 'critical') {
      steps.push('1. Export fresh FlexQuery report from IB for all dates');
      steps.push('2. Clear existing trade data and re-import');
      steps.push('3. Check IB Activity Statement for manual adjustments');
      steps.push('4. Verify no trades are missing from export');
    } else if (result.severity === 'warning') {
      steps.push('1. Review recent trades for this symbol');
      steps.push('2. Check for partial fills or corrections');
      steps.push('3. Verify option assignments were properly recorded');
    }

    if (result.discrepancy % 100 === 0) {
      steps.push('Discrepancy is multiple of 100 - likely option assignment issue');
    }

    return steps;
  }

  /**
   * Auto-fix positions based on IB data (with user confirmation)
   */
  async proposeAutoFix(report: ValidationReport): Promise<Map<string, number>> {
    const fixes = new Map<string, number>();

    for (const result of report.results) {
      if (result.severity === 'critical' || result.severity === 'warning') {
        // Propose using IB quantity as source of truth
        fixes.set(result.symbol, result.ibQuantity);
      }
    }

    return fixes;
  }

  /**
   * Disconnect from IB API
   */
  disconnect(): void {
    this.isConnected = false;
    console.log('🔌 Disconnected from IB API');
  }
}