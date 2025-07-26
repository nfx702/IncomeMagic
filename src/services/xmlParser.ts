import { parseString } from 'xml2js';
import { Trade } from '@/types/trade';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const parseXml = promisify(parseString);

export class IBTradeParser {
  private static instance: IBTradeParser;
  private parsedTrades: Map<string, Trade> = new Map();

  private constructor() {}

  static getInstance(): IBTradeParser {
    if (!IBTradeParser.instance) {
      IBTradeParser.instance = new IBTradeParser();
    }
    return IBTradeParser.instance;
  }

  async parseReportsDirectory(reportsDir: string): Promise<Trade[]> {
    const files = await fs.readdir(reportsDir);
    const xmlFiles = files.filter(file => file.endsWith('.xml'));

    for (const file of xmlFiles) {
      const filePath = path.join(reportsDir, file);
      await this.parseXmlFile(filePath);
    }

    return Array.from(this.parsedTrades.values());
  }

  private async parseXmlFile(filePath: string): Promise<void> {
    const xmlContent = await fs.readFile(filePath, 'utf-8');
    const result: any = await parseXml(xmlContent);

    if (result.FlexQueryResponse && result.FlexQueryResponse.FlexStatements) {
      const statements = result.FlexQueryResponse.FlexStatements[0].FlexStatement || [];
      
      for (const statement of statements) {
        if (statement.TradeConfirms) {
          const tradeConfirms = statement.TradeConfirms[0].TradeConfirm || [];
          
          for (const trade of tradeConfirms) {
            const parsedTrade = this.parseTradeConfirm(trade.$);
            if (parsedTrade && !this.parsedTrades.has(parsedTrade.tradeId)) {
              this.parsedTrades.set(parsedTrade.tradeId, parsedTrade);
            }
          }
        }
      }
    }
  }

  private parseTradeConfirm(trade: any): Trade | null {
    try {
      // Parse IB date format YYYYMMDD or YYYYMMDD;HHMMSS
      const parseIBDate = (dateStr: string): Date => {
        if (!dateStr || dateStr === '') return new Date();
        
        // Handle timestamp format YYYYMMDD;HHMMSS
        if (dateStr.includes(';')) {
          const [date, time] = dateStr.split(';');
          const year = parseInt(date.substring(0, 4));
          const month = parseInt(date.substring(4, 6)) - 1; // JS months are 0-based
          const day = parseInt(date.substring(6, 8));
          const hour = parseInt(time.substring(0, 2));
          const minute = parseInt(time.substring(2, 4));
          const second = parseInt(time.substring(4, 6));
          return new Date(year, month, day, hour, minute, second);
        }
        
        // Handle date-only format YYYYMMDD
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day);
      };

      const baseProps: Trade = {
        id: trade.tradeID,
        tradeId: trade.tradeID,
        dateTime: parseIBDate(trade.orderTime || trade.tradeDate),
        symbol: trade.symbol,
        assetCategory: trade.assetCategory,
        currency: trade.currency,
        quantity: parseFloat(trade.quantity),
        tradePrice: parseFloat(trade.price),
        tradeMoney: parseFloat(trade.amount),
        proceeds: parseFloat(trade.amount),
        commissionAndTax: parseFloat(trade.commission),
        netCash: parseFloat(trade.netCash),
        orderTime: parseIBDate(trade.orderTime),
        openDateTime: parseIBDate(trade.orderTime),
        reportDate: parseIBDate(trade.tradeDate),
        tradeDate: parseIBDate(trade.tradeDate),
        buy_sell: trade.buySell === 'BUY' ? 'BUY' : 'SELL',
        transactionId: trade.transactionID || trade.tradeID,
        orderReference: trade.orderReference || '',
        exchange: trade.exchange,
        notes: trade.notes || ''
      };

      if (trade.assetCategory === 'OPT' || trade.assetCategory === 'FOP') {
        // Extract underlying symbol from option symbol (e.g., "AAPL  250417P00190000" -> "AAPL")
        const underlyingSymbol = trade.symbol.split(' ')[0];
        
        return {
          ...baseProps,
          putCall: trade.putCall as 'P' | 'C',
          strike: parseFloat(trade.strike),
          expiry: parseIBDate(trade.expiry),
          multiplier: 100, // Standard option multiplier
          underlyingSymbol: underlyingSymbol
        };
      }

      return baseProps;
    } catch (error) {
      console.error('Error parsing trade:', error);
      return null;
    }
  }

  private parseOptionSymbol(symbol: string): {
    underlyingSymbol: string;
    expiry: Date | undefined;
    strike: string;
    putCall: 'P' | 'C';
  } {
    const match = symbol.match(/^(\w+)\s+(\d{2})(\w{3})(\d{2})\s+(\d+\.?\d*)\s*(P|C)$/);
    
    if (match) {
      const [, underlyingSymbol, day, monthStr, year, strike, putCall] = match;
      const monthMap: { [key: string]: number } = {
        JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
        JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
      };
      
      const month = monthMap[monthStr.toUpperCase()];
      const fullYear = 2000 + parseInt(year);
      const expiry = new Date(fullYear, month, parseInt(day));
      
      return {
        underlyingSymbol,
        expiry,
        strike,
        putCall: putCall as 'P' | 'C'
      };
    }

    return {
      underlyingSymbol: symbol,
      expiry: undefined,
      strike: '0',
      putCall: 'P'
    };
  }

  clearCache(): void {
    this.parsedTrades.clear();
  }
}