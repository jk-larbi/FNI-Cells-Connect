import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ChartDataPoint {
  week: string;
  soulsWon: number;
}

interface SoulsWonChartProps {
  data: ChartDataPoint[];
  title?: string;
}

export const SoulsWonChart: React.FC<SoulsWonChartProps> = ({
  data,
  title = 'Souls Won Across Cycles',
}) => {
  const hasData = data.some(d => d.soulsWon > 0);

  return (
    <div className="w-full h-72 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-3 h-3 rounded-xs bg-gold-500" /> Conversions Recorded
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6 text-center">
          <span className="text-xs font-bold text-navy-950">Awaiting Evangelism Returns</span>
          <p className="text-[11px] text-slate-400 mt-1">
            Real salvation harvest curves will plot dynamically as cell leaders submit soul counts.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="soulsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C59B27" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#C59B27" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="week"
              tick={{ fill: '#64748B', fontSize: 11 }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748B', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#071228',
                borderRadius: '8px',
                border: '1px solid #1E293B',
                color: '#F8FAFC',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="soulsWon"
              name="Souls Won"
              stroke="#C59B27"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#soulsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
