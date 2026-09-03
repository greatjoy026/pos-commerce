import React from 'react';
import { 
  Calendar, Clock, TrendingUp, DollarSign, 
  ShoppingCart, Users, ArrowUpRight, BarChart3 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, 
  YAxis, Tooltip, CartesianGrid, BarChart, Bar 
} from 'recharts';
import { Order } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface DailySalesReportProps {
  orders: Order[];
}

export default function DailySalesReport({ orders }: DailySalesReportProps) {
  const { formatAmount } = useCurrency();

  // Aggregate daily metrics
  const completedOrders = orders.filter(o => o.status !== 'Refunded');
  const totalSales = completedOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalTax = completedOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
  const totalTransactions = completedOrders.length;
  const averageTicket = totalTransactions > 0 ? (totalSales + totalTax) / totalTransactions : 0;

  // Build hourly distribution (8 AM to 9 PM)
  const hourlyMap: Record<number, { hourLabel: string; sales: number; count: number }> = {};
  for (let h = 8; h <= 21; h++) {
    const label = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
    hourlyMap[h] = { hourLabel: label, sales: 0, count: 0 };
  }

  // Group orders by hour
  orders.forEach(o => {
    const d = new Date(o.date);
    const hour = d.getHours();
    if (hourlyMap[hour]) {
      hourlyMap[hour].sales += (o.subtotal || 0);
      hourlyMap[hour].count += 1;
    } else {
      // Fallback distribute
      const midHour = 14;
      if (hourlyMap[midHour]) {
        hourlyMap[midHour].sales += (o.subtotal || 0);
        hourlyMap[midHour].count += 1;
      }
    }
  });

  const hourlyChartData = Object.values(hourlyMap);
  const peakHour = [...hourlyChartData].sort((a, b) => b.sales - a.sales)[0];

  return (
    <div className="space-y-6" id="daily-sales-report">
      
      {/* 1. Metric Header Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Daily Volume</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatAmount(totalSales + totalTax)}
          </div>
          <p className="text-[11px] text-slate-400">Net Sales: {formatAmount(totalSales)} + Tax {formatAmount(totalTax)}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transactions</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalTransactions} <span className="text-sm font-normal text-slate-500">Tickets</span>
          </div>
          <p className="text-[11px] text-slate-400">Closed retail & online checkouts</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Ticket (AOV)</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-700 font-mono">
            {formatAmount(averageTicket)}
          </div>
          <p className="text-[11px] text-slate-400">Basket size per customer checkout</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peak Velocity Hour</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {peakHour ? peakHour.hourLabel : '2:00 PM'}
          </div>
          <p className="text-[11px] text-slate-400">{peakHour ? `${formatAmount(peakHour.sales)} generated` : 'Steady throughput'}</p>
        </div>

      </div>

      {/* 2. Visual Hourly Heatmap / Area Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Intraday Hourly Sales Curve</h3>
            <p className="text-xs text-slate-400">Revenue generation & transaction frequency across business operating hours</p>
          </div>
          <BarChart3 className="w-4 h-4 text-slate-400" />
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="hourLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                formatter={(val: number) => [formatAmount(val), 'Sales Volume']}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Transaction Log Summary */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Today's Transactions Journal</h3>
            <p className="text-xs text-slate-400">Audited receipt stream and payment clearance</p>
          </div>
          <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
            {orders.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Receipt / Order #</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {orders.slice(0, 10).map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-700">{o.id}</td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                    {new Date(o.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{o.customerName || 'Walk-in Guest'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {o.source || 'POS Terminal'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{o.paymentMethod}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(o.subtotal || 0)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">{formatAmount(o.tax || 0)}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-slate-900">{formatAmount(o.total || 0)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      o.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                      o.status === 'Refunded' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
