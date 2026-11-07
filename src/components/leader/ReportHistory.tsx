import React, { useState } from 'react';
import { Cell, WeeklyReport, ReportStatus } from '../../types';
import { formatDate } from '../../lib/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Search, Filter, Download, ChevronRight, FileText } from 'lucide-react';

interface ReportHistoryProps {
  cell: Cell;
  reports: WeeklyReport[];
  onViewReport: (reportId: string) => void;
  onEditReport?: (reportId: string) => void;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({
  cell,
  reports,
  onViewReport,
  onEditReport
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const sortedReports = [...reports].sort((a, b) => b.week.localeCompare(a.week));

  const filteredReports = sortedReports.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPrayer = (r.prayer || '').toLowerCase().includes(q);
      const matchTest = (r.test || '').toLowerCase().includes(q);
      const matchChal = (r.chal || '').toLowerCase().includes(q);
      const matchWeek = formatDate(r.week).toLowerCase().includes(q);
      return matchPrayer || matchTest || matchChal || matchWeek;
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Week', 'Attendance', 'Visitors', 'Souls Won', 'Follow-ups', 'Evangelism Outreaches', 'Cell Meetings', 'Status', 'Reviewer Note', 'Prayer Requests', 'Testimonies'];
    const rows = filteredReports.map(r => [
      r.week,
      r.att,
      r.vis,
      r.souls,
      r.fu,
      r.evg,
      r.meet,
      r.status,
      `"${(r.note || '').replace(/"/g, '""')}"`,
      `"${(r.prayer || '').replace(/"/g, '""')}"`,
      `"${(r.test || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${cell.name.replace(/\s+/g, '_')}_Reports.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F2447] tracking-tight font-serif-title">
            My Reporting History
          </h1>
          <p className="text-sm text-[#5B6472] mt-0.5">
            Archival weekly reports filed for {cell.name}
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors self-start sm:self-auto shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-[#5B6472]" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
          <input
            type="text"
            placeholder="Search dates, testimonies, prayers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-[#5B6472]" />
          <span className="text-xs text-[#5B6472] font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-[#E3E6EB] rounded px-2.5 py-1.5 bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A]"
          >
            <option value="All">All statuses ({reports.length})</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Returned">Returned</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg overflow-hidden shadow-xs">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5B6472]">
            <FileText className="w-8 h-8 text-[#AEB9CF] mx-auto mb-2" />
            <p>No reports match your selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#5B6472] border-b border-[#E3E6EB] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Reporting Week</th>
                  <th className="py-2.5 px-4 text-right">Attendance</th>
                  <th className="py-2.5 px-4 text-right">Visitors</th>
                  <th className="py-2.5 px-4 text-right">Souls Won</th>
                  <th className="py-2.5 px-4 text-right">Follow-ups</th>
                  <th className="py-2.5 px-4 text-right">Evangelism</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EB]">
                {filteredReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#0F2447] whitespace-nowrap">
                      Week of {formatDate(rep.week)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {rep.att}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {rep.vis}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-[#0F2447]">
                      {rep.souls}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {rep.fu}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#14213D]">
                      {rep.evg}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={rep.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {rep.status === 'Returned' && onEditReport && (
                          <button
                            onClick={() => onEditReport(rep.id)}
                            className="text-[#8A5A00] hover:underline font-medium"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => onViewReport(rep.id)}
                          className="text-[#1B3F7A] hover:text-[#0F2447] font-medium hover:underline inline-flex items-center gap-1"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
