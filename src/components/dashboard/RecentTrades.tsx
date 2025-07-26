'use client';

import { Trade } from '@/types/trade';
import { format } from 'date-fns';

interface RecentTradesProps {
  trades: Trade[];
}

export function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <div className="glass-card p-6 liquid-glass">
      <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Symbol</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Qty</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Price</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Net Cash</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 text-sm">
                  {format(trade.dateTime, 'MMM dd, yyyy')}
                </td>
                <td className="py-3 px-4 text-sm font-medium">
                  {trade.underlyingSymbol || trade.symbol.split(' ')[0]}
                </td>
                <td className="py-3 px-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    trade.assetCategory === 'OPT' ? 'bg-purple-500/20 text-purple-500' :
                    trade.assetCategory === 'STK' ? 'bg-blue-500/20 text-blue-500' :
                    'bg-orange-500/20 text-orange-500'
                  }`}>
                    {trade.assetCategory}
                    {trade.putCall && ` ${trade.putCall === 'P' ? 'PUT' : 'CALL'}`}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm">
                  <span className={`font-medium ${
                    trade.buy_sell === 'BUY' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {trade.buy_sell}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  {Math.abs(trade.quantity)}
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  ${(trade.tradePrice || 0).toFixed(2)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-medium">
                  <span className={trade.netCash >= 0 ? 'text-green-500' : 'text-red-500'}>
                    ${(trade.netCash || 0).toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}