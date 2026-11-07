import React, { useState, useEffect } from 'react';
import { Cell, Region, CellReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ReportService } from '../../services/reportService';
import { Badge } from '../common/Badge';
import { StatCard } from '../dashboard/StatCard';
import {
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Clock,
  Send,
  ExternalLink,
} from 'lucide-react';

export const RegionalManagementView: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  const { triggerBatchReminders, dispatchNotification } = useNotifications();

  const [regions, setRegions] = useState<Region[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [reports, setReports] = useState<CellReport[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [rList, cList, repList] = await Promise.all([
          ReportService.getRegions(),
          ReportService.getCells(),
          ReportService.getReports(),
        ]);
        setRegions(rList);
        setCells(cList);
        setReports(repList);

        if (currentUser.region_id) {
          setSelectedRegionId(currentUser.region_id);
        } else if (rList.length > 0) {
          setSelectedRegionId(rList[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  const activeRegion = regions.find(r => r.id === selectedRegionId) || regions[0];
  const regionCells = cells.filter(c => c.region_id === activeRegion?.id);

  const submittedCellIds = new Set(
    reports
      .filter(r => r.period_id === 'prd-w45' && (r.status === 'submitted' || r.status === 'approved' || r.status === 'under_review'))
      .map(r => r.cell_id)
  );

  const outstandingCells = regionCells.filter(c => !submittedCellIds.has(c.id));
  const compliantCells = regionCells.filter(c => submittedCellIds.has(c.id));
  const compliancePercent = regionCells.length > 0
    ? Math.round((compliantCells.length / regionCells.length) * 100)
    : 100;

  const handleSendNudge = (cell: Cell) => {
    dispatchNotification(
      `Reporting Notice: ${cell.name}`,
      `Urgent reminder sent via WhatsApp to ${cell.leader_name} (${cell.leader_phone || 'cell leader'}) for pending Week 45 report.`,
      'overdue_notice',
      'whatsapp'
    );
    alert(`Reporting reminder sent via WhatsApp/Email to ${cell.leader_name} for ${cell.name}.`);
  };

  const handleBroadcastReminders = () => {
    const count = triggerBatchReminders('2026 - Week 45');
    alert(`Automated reporting reminders dispatched to all ${count} leaders across regions via Email and WhatsApp.`);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading regional portfolio...</div>;
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-6">
      {/* Header and Region Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-navy-950">
            {activeRegion?.name || 'Regional Oversight'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Regional Overseer: <strong>{activeRegion?.leader_name || 'Pastor Samuel Oladipo'}</strong> • Code: {activeRegion?.code}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {regions.length > 1 && (
            <select
              value={selectedRegionId}
              onChange={e => setSelectedRegionId(e.target.value)}
              className="text-xs font-semibold rounded-xl border-0 bg-slate-50 text-navy-950 p-2.5 focus:ring-1 focus:ring-navy-600 cursor-pointer"
            >
              {regions.map(reg => (
                <option key={reg.id} value={reg.id}>
                  {reg.name} ({reg.code})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleBroadcastReminders}
            className="px-4 py-2 rounded-xl bg-navy-900 text-white text-xs font-bold flex items-center gap-2 hover:bg-navy-950 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-gold-400" />
            <span>Broadcast Nudges</span>
          </button>
        </div>
      </div>

      {/* Modern Squircle Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Week 45 Compliance"
          value={`${compliancePercent}%`}
          subtitle={`${compliantCells.length} of ${regionCells.length} submitted`}
          icon={<CheckCircle2 className="w-5 h-5 text-gold-400" />}
          isActive={true}
        />

        <StatCard
          title="Assigned Units"
          value={regionCells.length}
          subtitle={`Across ${activeRegion?.state_province || activeRegion?.country}`}
          icon={<Building2 className="w-5 h-5 text-gold-400" />}
          isActive={false}
        />

        <StatCard
          title="Outstanding Action"
          value={outstandingCells.length}
          subtitle={outstandingCells.length === 0 ? 'All units compliant' : 'Awaiting submission'}
          icon={<AlertTriangle className="w-5 h-5 text-gold-400" />}
          isActive={false}
        />
      </div>

      {/* Outstanding Alert Strip */}
      {outstandingCells.length > 0 && (
        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/60">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Cells with Pending Reports (Deadline Sunday)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 mb-3">
                The following fellowship units have not yet filed returns for Week 45:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {outstandingCells.map(c => (
                  <div
                    key={c.id}
                    className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-navy-950">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.leader_name} • {c.leader_phone}</div>
                    </div>
                    <button
                      onClick={() => handleSendNudge(c)}
                      className="px-3 py-1.5 rounded-lg bg-navy-900 text-white text-[11px] font-semibold flex items-center gap-1.5 hover:bg-navy-950 transition-colors"
                    >
                      <Phone className="w-3 h-3 text-gold-400" />
                      <span>Remind</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Cells Directory Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wider">
          Cell Directory ({activeRegion?.name})
        </h3>
        <div className="table-scroll-container custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100">
                <th className="py-3 px-3">Cell Name</th>
                <th className="py-3 px-3">Leader</th>
                <th className="py-3 px-3">Schedule</th>
                <th className="py-3 px-3">Venue Address</th>
                <th className="py-3 px-3">Target</th>
                <th className="py-3 px-3 text-right">Week 45 Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {regionCells.map(cell => {
                const isSubmitted = submittedCellIds.has(cell.id);
                return (
                  <tr key={cell.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-navy-950">{cell.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{cell.code}</div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{cell.leader_name}</div>
                      <div className="text-[11px] text-slate-400">{cell.leader_phone}</div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                      {cell.meeting_day} @ {cell.meeting_time}
                    </td>
                    <td className="py-3.5 px-3 max-w-xs truncate text-slate-500">
                      {cell.venue_address}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap font-bold text-navy-950">
                      {cell.target_attendance} pax
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-right">
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Filed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
