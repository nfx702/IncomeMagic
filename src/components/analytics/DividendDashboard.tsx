'use client';

import { useMemo, useState } from 'react';
import { 
  IconCash,
  IconCalendar,
  IconTrendingUp,
  IconCoins,
  IconChartPie,
  IconInfoCircle,
  IconChevronDown,
  IconChevronRight
} from '@tabler/icons-react';
import { 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { DividendAnalytics, DividendPayment } from '@/services/dividendTracker';
import { format } from 'date-fns';

interface DividendDashboardProps {
  analytics: DividendAnalytics;
  upcomingDividends: Array<{
    symbol: string;
    estimatedPaymentDate: Date;
    estimatedAmount: number;
    shares: number;
  }>;
}

export function DividendDashboard({ analytics, upcomingDividends }: DividendDashboardProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (symbol: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  const monthlyData = useMemo(() => {
    const data: Array<{ month: string; amount: number }> = [];
    
    // Get last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      data.push({
        month: format(date, 'MMM yy'),
        amount: analytics.byMonth.get(monthKey) || 0
      });
    }
    
    return data;
  }, [analytics]);

  const pieData = useMemo(() => {
    return analytics.topPayers.map((payer, index) => ({
      name: payer.symbol,
      value: payer.total,
      percentage: payer.percentage
    }));
  }, [analytics]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    return (
      <div className="glass-card p-3 shadow-xl border border-white/30">
        <p className="font-medium text-slate-800 dark:text-slate-200">
          {payload[0].payload.month || payload[0].name}
        </p>
        <p className="text-sm mt-1">
          <span className="text-slate-600 dark:text-slate-400">Amount: </span>
          <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
        </p>
        {payload[0].payload.percentage && (
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Share: </span>
            <span className="font-semibold">{payload[0].payload.percentage.toFixed(1)}%</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400/20 to-green-500/20 border border-emerald-400/30">
              <IconCash size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Dividends</p>
          </div>
          <p className="premium-number mb-1">
            {formatCurrency(analytics.totalDividends)}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 px-2 py-1 rounded-full">
            All time
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-400/20 to-indigo-500/20 border border-blue-400/30">
              <IconCalendar size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Year to Date</p>
          </div>
          <p className="premium-number mb-1">
            {formatCurrency(analytics.yearToDate)}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-2 py-1 rounded-full">
            {new Date().getFullYear()}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-400/20 to-pink-500/20 border border-purple-400/30">
              <IconTrendingUp size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Projected Annual</p>
          </div>
          <p className="premium-number mb-1">
            {formatCurrency(analytics.projectedAnnual)}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-2 py-1 rounded-full">
            Based on YTD
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30">
              <IconCoins size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dividend Stocks</p>
          </div>
          <p className="text-2xl font-bold mb-1 text-amber-600 dark:text-amber-400">
            {analytics.bySymbol.size}
          </p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-2 py-1 rounded-full">
            Paying positions
          </p>
        </div>
      </div>

      {/* Enhanced Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Dividends Chart */}
        <div className="chart-container">
          <h3 className="text-xl font-bold gradient-text-primary mb-6 flex items-center gap-2">
            <IconChartPie size={24} />
            Monthly Dividend Income
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Dividend Payers */}
        <div className="glass-card p-6 liquid-glass">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Top Dividend Payers
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${entry.percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dividend Details Table */}
      <div className="glass-card p-6 liquid-glass">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
          Dividend Details by Symbol
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                  
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Symbol
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Total Received
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Payments
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Avg Yield %
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                  Last Payment
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from(analytics.bySymbol.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .map(([symbol, data]) => (
                  <>
                    <tr 
                      key={symbol} 
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      onClick={() => toggleRowExpansion(symbol)}
                    >
                      <td className="py-3 px-4">
                        <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                          {expandedRows.has(symbol) ? (
                            <IconChevronDown size={16} className="text-slate-600 dark:text-slate-400" />
                          ) : (
                            <IconChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {symbol}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        {formatCurrency(data.total)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        {data.payments.length}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        {data.averageYield.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">
                        {format(data.payments[data.payments.length - 1].paymentDate, 'MMM d, yyyy')}
                      </td>
                    </tr>
                    
                    {/* Expanded row showing individual payments */}
                    {expandedRows.has(symbol) && (
                      <tr key={`${symbol}-expanded`} className="bg-slate-50/50 dark:bg-slate-800/30">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="pl-6">
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                              Individual Dividend Payments for {symbol}
                            </h4>
                            <div className="bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-100 dark:bg-slate-800">
                                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                      Payment Date
                                    </th>
                                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                      Amount
                                    </th>
                                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                      Shares
                                    </th>
                                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                      Per Share
                                    </th>
                                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                      Yield %
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.payments
                                    .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())
                                    .map((payment, index) => (
                                      <tr 
                                        key={index} 
                                        className="border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                                      >
                                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                          {format(payment.paymentDate, 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                          {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                                          {payment.shares.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                                          {formatCurrency(payment.amount / payment.shares)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                                          {data.averageYield.toFixed(2)}%
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                              
                              {/* Summary for this symbol */}
                              <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600 dark:text-slate-400">
                                    Total: {data.payments.length} payments over {
                                      Math.round((Date.now() - Math.min(...data.payments.map(p => p.paymentDate.getTime()))) / (1000 * 60 * 60 * 24 * 30))
                                    } months
                                  </span>
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    Avg: {formatCurrency(data.total / data.payments.length)} per payment
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Dividends */}
      {upcomingDividends.length > 0 && (
        <div className="glass-card p-6 liquid-glass">
          <div className="flex items-center gap-2 mb-4">
            <IconInfoCircle size={20} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Upcoming Dividends (Estimated)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingDividends.map((div, index) => (
              <div key={index} className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {div.symbol}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {div.shares} shares
                  </span>
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(div.estimatedAmount)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Est. {format(div.estimatedPaymentDate, 'MMM d, yyyy')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note about data */}
      <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <IconInfoCircle size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Dividend Data Note</p>
            <p>
              This is currently using estimated dividend data based on typical yields. 
              To enable real dividend tracking, configure your IB FlexQuery to include the CashReport section 
              with dividend transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}