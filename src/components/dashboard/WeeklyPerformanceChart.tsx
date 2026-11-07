import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ChartDataPoint {
  week: string;
  attendance: number;
  visitors: number;
  soulsWon: number;
}

interface WeeklyPerformanceChartProps {
  data: ChartDataPoint[];
  title?: string;
}

export const WeeklyPerformanceChart: React.FC<WeeklyPerformanceChartProps> = ({
  data,
  title = 'Weekly Attendance & Visitors Trend',
}) => {
  const hasData = data.some(d => d.attendance > 0 || d.visitors > 0);

  return (
    <div className="w-full h-72 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h4>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-3 rounded-xs bg-[#0B1B3D]" /> Attendance
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-3 rounded-xs bg-[#C59B27]" /> Visitors
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6 text-center">
          <span className="text-xs font-bold text-navy-950">Awaiting Weekly Returns</span>
          <p className="text-[11px] text-slate-400 mt-1">
            Real turnout curves will plot here dynamically as reports are submitted.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
              }}
              cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
            />
            <Bar dataKey="attendance" name="Attendance" fill="#0B1B3D" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="visitors" name="Visitors" fill="#C59B27" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
