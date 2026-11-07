import React, { useState } from 'react';
import { Cell, WeeklyReport, ReportStatus } from '../../types';
import { formatDate } from '../../lib/storage';
import { StatusBadge } from '../common/StatusBadge';
import { Search, Filter, Download, ChevronRight, FileSpreadsheet } from 'lucide-react';

interface AllReportsProps {
  cells: Cell[];
  reports: WeeklyReport[];
  onViewReport: (reportId: string) => void;
}

export const AllReports: React.FC<AllReportsProps> = ({
  cells,
  reports,
  onViewReport
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [cellFilter, setCellFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const sortedReports = [...reports].sort((a, b) => b.week.localeCompare(a.week));

  const getCell = (id: string) => cells.find(c => c.id === id);

  const filteredReports = sortedReports.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (cellFilter !== 'All' && r.cell !== cellFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cellObj = getCell(r.cell);
      const cellName = (cellObj?.name || '').toLowerCase();
      const leaderName = (cellObj?.leader || '').toLowerCase();
      const prayer = (r.prayer || '').toLowerCase();
      const test = (r.test || '').toLowerCase();
      const week = formatDate(r.week).toLowerCase();
      return cellName.includes(q) || leaderName.includes(q) || prayer.includes(q) || test.includes(q) || week.includes(q);
    }
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Report ID', 'Cell', 'Area', 'Leader', 'Week', 'Attendance', 'Visitors', 'Souls Won', 'Follow-ups', 'Evangelism', 'Meetings', 'Status', 'Reviewer Note', 'Prayer Requests', 'Testimonies', 'Challenges'];
    const rows = filteredReports.map(r => {
      const c = getCell(r.cell);
      return [
        r.id,
        `"${c?.name || r.cell}"`,
        `"${c?.area || ''}"`,
        `"${c?.leader || ''}"`,
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
        `"${(r.test || '').replace(/"/g, '""')}"`,
        `"${(r.chal || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FNI_Cell_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F2447] tracking-tight font-serif-title">
            All Submitted Reports
          </h1>
          <p className="text-sm text-[#5B6472] mt-0.5">
            Weekly cell returns submitted by cell leaders for administrator review
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors self-start sm:self-auto shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-[#B8923A]" />
          <span>Export Reports CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
          <input
            type="text"
            placeholder="Search cell, leader, testimonies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-[#5B6472]">
            <span>Cell:</span>
            <select
              value={cellFilter}
              onChange={(e) => setCellFilter(e.target.value)}
              className="text-xs border border-[#E3E6EB] rounded px-2.5 py-1.5 bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A]"
            >
              <option value="All">All Cells ({cells.length})</option>
              {cells.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#5B6472]">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-[#E3E6EB] rounded px-2.5 py-1.5 bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A]"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted (Pending)</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-[#E3E6EB] bg-[#FDFDFE] flex items-center justify-between text-xs text-[#5B6472]">
          <span>Displaying <strong>{filteredReports.length}</strong> reports</span>
          <span>Reporting cycle: Weekly</span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#5B6472]">
            <FileSpreadsheet className="w-8 h-8 text-[#AEB9CF] mx-auto mb-2" />
            <p className="font-medium text-[#0F2447]">No reports matched your selected criteria.</p>
            <span className="text-[11px] text-[#8C95A3]">Try adjusting filters or the search text.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#5B6472] border-b border-[#E3E6EB] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Reporting Week</th>
                  <th className="py-2.5 px-4">Cell Name</th>
                  <th className="py-2.5 px-4">Area & Leader</th>
                  <th className="py-2.5 px-4 text-right">Attendance</th>
                  <th className="py-2.5 px-4 text-right">Visitors</th>
                  <th className="py-2.5 px-4 text-right">Souls Won</th>
                  <th className="py-2.5 px-4 text-right">Follow-ups</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EB]">
                {filteredReports.map((rep) => {
                  const c = getCell(rep.cell);
                  return (
                    <tr key={rep.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#0F2447] whitespace-nowrap">
                        Week of {formatDate(rep.week)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0F2447] whitespace-nowrap">
                        {c?.name || rep.cell}
                      </td>
                      <td className="py-3 px-4 text-[#5B6472] whitespace-nowrap">
                        <div>{c?.leader || '—'}</div>
                        <div className="text-[11px] text-[#8C95A3]">{c?.area || ''}</div>
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
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={rep.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onViewReport(rep.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#1B3F7A] bg-[#E6ECF7] hover:bg-[#D5E1F5] rounded transition-colors inline-flex items-center gap-1"
                        >
                          <span>{rep.status === 'Submitted' ? 'Review' : 'View'}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
