import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Building } from 'lucide-react';
import { Button } from '../common/Button';
import { CellPerformanceRecord } from '../../types';

interface ComplianceTrackerProps {
  cellStats?: CellPerformanceRecord[];
  onViewCells?: () => void;
  // Legacy compatibility props
  regionalStats?: any[];
  onViewRegional?: () => void;
}

export const ComplianceTracker: React.FC<ComplianceTrackerProps> = ({
  cellStats = [],
  onViewCells,
  regionalStats = [],
  onViewRegional,
}) => {
  // Prefer cellStats if present, else fallback
  const items = cellStats.length > 0 ? cellStats : regionalStats;
  const onNavigate = onViewCells || onViewRegional || (() => {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cell Reporting Compliance
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Weekly cell deadline: Sunday 6:00 PM Ghana Time (UTC+0)
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigate}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          View All Cells
        </Button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            <Building className="w-6 h-6 text-slate-300 mx-auto mb-1" />
            No registered cells yet. As tutors sign up, their compliance will show here.
          </div>
        ) : (
          items.map(item => {
            const isHigh = item.compliance >= 80;
            const isMid = item.compliance >= 50 && item.compliance < 80;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-navy-950">{item.name || item.cellName}</span>
                  <span className="font-bold text-slate-700">
                    {item.compliance}% Compliance
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isHigh
                        ? 'bg-emerald-600'
                        : isMid
                        ? 'bg-gold-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.compliance}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Turnout: <strong>{item.totalAttendance ?? item.attendance ?? 0}</strong></span>
                  <span>Souls: <strong className="text-gold-700">+{item.soulsWon ?? item.souls ?? 0}</strong></span>
                  <span>Status: <strong className={isHigh ? 'text-emerald-700' : 'text-amber-700'}>{item.status || (isHigh ? 'On Track' : 'Pending')}</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
