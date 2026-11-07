import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

interface RegionalStat {
  id: string;
  name: string;
  code: string;
  cells: number;
  compliance: number;
  souls: number;
  visitors: number;
  attendance: number;
}

interface ComplianceTrackerProps {
  regionalStats: RegionalStat[];
  onViewRegional: () => void;
}

export const ComplianceTracker: React.FC<ComplianceTrackerProps> = ({
  regionalStats,
  onViewRegional,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Regional Reporting Compliance (Week 45)
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Submission deadline: Sunday 23:59 GMT
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewRegional}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          View Regions
        </Button>
      </div>

      <div className="space-y-3">
        {regionalStats.map(reg => {
          const isHigh = reg.compliance >= 80;
          const isMid = reg.compliance >= 50 && reg.compliance < 80;

          return (
            <div
              key={reg.id}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-navy-950">{reg.name}</span>
                <span className="font-bold text-slate-700">
                  {reg.compliance}% Compliance
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
                  style={{ width: `${reg.compliance}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Total Cells: <strong>{reg.cells}</strong></span>
                <span>Souls Won: <strong className="text-gold-700">{reg.souls}</strong></span>
                <span>Total Att: <strong>{reg.attendance}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
