import React, { useState } from 'react';
import { CellReport, Region, ReportingPeriod } from '../../types';
import { Badge } from '../common/Badge';
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface ReportHistoryTableProps {
  reports: CellReport[];
  regions: Region[];
  periods: ReportingPeriod[];
  onSelectReport: (report: CellReport) => void;
  onRefresh: () => void;
}

export const ReportHistoryTable: React.FC<ReportHistoryTableProps> = ({
  reports,
  regions,
  periods,
  onSelectReport,
  onRefresh,
}) => {
  const [nameFilter, setNameFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredReports = reports.filter(r => {
    const matchesName =
      !nameFilter.trim() ||
      (r.cell_name && r.cell_name.toLowerCase().includes(nameFilter.toLowerCase())) ||
      (r.submitted_by_name && r.submitted_by_name.toLowerCase().includes(nameFilter.toLowerCase()));

    const matchesRegion = regionFilter === 'all' || r.region_id === regionFilter;
    const matchesPeriod = periodFilter === 'all' || r.period_id === periodFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesName && matchesRegion && matchesPeriod && matchesStatus;
  });

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const displayedReports = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const exportCSV = () => {
    const headers = ['Cell Name', 'Region', 'Cycle', 'Leader', 'Status', 'Attendance', 'Souls Won', 'Follow-ups', 'Submitted At'];
    const rows = filteredReports.map(r => [
      `"${r.cell_name || ''}"`,
      `"${r.region_name || ''}"`,
      `"${r.period_name || ''}"`,
      `"${r.submitted_by_name || ''}"`,
      r.status,
      r.total_attendance,
      r.souls_won,
      r.follow_ups_conducted,
      `"${r.submitted_at || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FNI_Reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-5">
      {/* Table Header / Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">Reports Repository</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ministry returns and review verification records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Modern Multi-Column Filter Strip (matching screenshot design) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 pb-1 border-t border-slate-100 text-xs">
        <div>
          <span className="block text-[11px] font-medium text-slate-400 mb-1">Cell / Leader</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Type to filter..."
              value={nameFilter}
              onChange={e => {
                setNameFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium rounded-xl border-0 bg-slate-50 px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-navy-600 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-slate-400 mb-1">Region</span>
          <select
            value={regionFilter}
            onChange={e => {
              setRegionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs font-medium rounded-xl border-0 bg-slate-50 px-3 py-2 text-slate-700 focus:ring-1 focus:ring-navy-600 focus:bg-white"
          >
            <option value="all">All Regions</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-slate-400 mb-1">Cycle</span>
          <select
            value={periodFilter}
            onChange={e => {
              setPeriodFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs font-medium rounded-xl border-0 bg-slate-50 px-3 py-2 text-slate-700 focus:ring-1 focus:ring-navy-600 focus:bg-white"
          >
            <option value="all">All Cycles</option>
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-slate-400 mb-1">Status</span>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs font-medium rounded-xl border-0 bg-slate-50 px-3 py-2 text-slate-700 focus:ring-1 focus:ring-navy-600 focus:bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="needs_revision">Needs Revision</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-scroll-container custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100">
              <th className="py-3 px-3">Cell Name</th>
              <th className="py-3 px-3">Leader</th>
              <th className="py-3 px-3">Region</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Att / Souls</th>
              <th className="py-3 px-3">Submitted</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {displayedReports.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  No records match your filter criteria.
                </td>
              </tr>
            ) : (
              displayedReports.map(report => (
                <tr
                  key={report.id}
                  onClick={() => onSelectReport(report)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  {/* Cell Name with circle avatar */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-navy-50 text-navy-800 font-bold flex items-center justify-center text-xs border border-navy-100/60">
                        {report.cell_name?.slice(0, 2).toUpperCase() || 'FC'}
                      </div>
                      <div>
                        <div className="font-bold text-navy-950 group-hover:text-navy-700 transition-colors">
                          {report.cell_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {report.period_name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Leader with copy button */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <span>{report.submitted_by_name || 'Leader'}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(report.submitted_by_name || '', report.id);
                        }}
                        className="text-slate-400 hover:text-navy-900 p-0.5 rounded transition-colors"
                        title="Copy leader name"
                      >
                        {copiedId === report.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>

                  {/* Region with link icon */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-slate-600 font-medium">
                      <span>{report.region_name}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-60" />
                    </div>
                  </td>

                  {/* Status Pill */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <Badge status={report.status} />
                  </td>

                  {/* Attendance & Souls */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="font-bold text-navy-950">
                      {report.total_attendance} <span className="text-[10px] font-normal text-slate-400">att</span>
                      <span className="ml-2 font-bold text-gold-600">+{report.souls_won} souls</span>
                    </div>
                  </td>

                  {/* Submitted Date */}
                  <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-medium text-[11px]">
                    {report.submitted_at
                      ? new Date(report.submitted_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Draft'}
                  </td>

                  {/* Action Icons */}
                  <td className="py-3.5 px-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(report);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition-colors"
                        title="Open review sheet"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReport(report);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition-colors"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Numbered Pagination Bar (matching screenshot layout) */}
      <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-slate-100">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
              currentPage === page
                ? 'bg-navy-900 text-white shadow-xs'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
