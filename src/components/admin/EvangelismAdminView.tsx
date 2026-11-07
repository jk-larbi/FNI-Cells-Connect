import React, { useState, useEffect } from 'react';
import { EvangelismReport, Cell } from '../../types';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';
import {
  Flame,
  Search,
  Download,
  Users,
  MapPin,
  Calendar,
  Eye,
  X,
  MessageSquare,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export const EvangelismAdminView: React.FC = () => {
  const [reports, setReports] = useState<EvangelismReport[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCellFilter, setSelectedCellFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [inspectingReport, setInspectingReport] = useState<EvangelismReport | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [eList, cList] = await Promise.all([
        ReportService.getEvangelismReports(),
        CellService.getCells(),
      ]);
      setReports(eList);
      setCells(cList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSouls = reports.reduce((sum, r) => sum + (Number(r.conversions) || 0), 0);
  const totalReached = reports.reduce((sum, r) => sum + (Number(r.peopleSpokenTo) || 0), 0);
  const totalContacts = reports.reduce((sum, r) => sum + (Number(r.contactsCaptured) || 0), 0);
  const totalInterested = reports.reduce((sum, r) => sum + (Number(r.interestedInMinistry) || 0), 0);

  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.cellName.toLowerCase().includes(q) ||
      r.tutorName.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q);

    const matchesCell = selectedCellFilter === 'All' || r.cellId === selectedCellFilter;

    return matchesSearch && matchesCell;
  });

  const handleExportCsv = () => {
    const header = ['Date', 'Cell Name', 'Tutor', 'Location', 'Souls Won', 'People Reached', 'Contacts Captured', 'Interested in Ministry', 'Message Used'];
    const rows = filteredReports.map(r => [
      `"${r.date}"`,
      `"${r.cellName}"`,
      `"${r.tutorName}"`,
      `"${r.location}"`,
      r.conversions,
      r.peopleSpokenTo,
      r.contactsCaptured,
      r.interestedInMinistry || 0,
      `"${r.messageUsed ? r.messageUsed.replace(/"/g, '""') : ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FNI_Evangelism_Outreaches_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
            Evangelism & Soul-Winning Directorate
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Central repository of all street outreaches, campus missions, conversions, and captured contacts.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E3E8EF] text-[#182230] text-xs font-bold hover:bg-[#F5F7FA] transition-colors shadow-sm flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#142B4A]" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Total Conversions</div>
          <div className="text-2xl font-black text-[#23845B] mt-1">+{totalSouls}</div>
          <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Souls Saved</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">People Reached</div>
          <div className="text-2xl font-black text-[#182230] mt-1">{totalReached}</div>
          <div className="text-[10px] text-[#667085] font-semibold mt-0.5">Heard the Gospel</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Contacts Captured</div>
          <div className="text-2xl font-black text-[#C6A45A] mt-1">{totalContacts}</div>
          <div className="text-[10px] text-[#667085] font-semibold mt-0.5">In Follow-up Funnel</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Interested in Ministry</div>
          <div className="text-2xl font-black text-[#142B4A] mt-1">{totalInterested}</div>
          <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Prospective Members</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E8EF] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by cell, tutor, or location..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E3E8EF] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] text-[#182230]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCellFilter}
            onChange={e => setSelectedCellFilter(e.target.value)}
            className="p-2 text-xs rounded-xl border border-[#E3E8EF] bg-white text-[#182230]"
          >
            <option value="All">All Cells</option>
            {cells.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Evangelism Table (Reference Image Styled!) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#182230]">
            Evangelism Reports ({filteredReports.length})
          </h2>
          <span className="text-xs text-[#667085]">
            Real-time submissions from cell leaders & teams
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">TUTOR & CELL</th>
                <th className="py-3 px-4">OUTREACH LOCATION</th>
                <th className="py-3 px-4">CONVERSIONS</th>
                <th className="py-3 px-4">PEOPLE REACHED</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    <Flame className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No evangelism reports found.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => (
                  <tr
                    key={report.id}
                    onClick={() => setInspectingReport(report)}
                    className="hover:bg-[#F5F7FA] cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-5 text-center">
                      <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                          {report.tutorName
                            ? report.tutorName
                                .split(' ')
                                .map(n => n[0])
                                .slice(0, 2)
                                .join('')
                            : 'TL'}
                        </div>
                        <div>
                          <div className="font-bold text-[#182230] leading-tight">
                            {report.tutorName}
                          </div>
                          <div className="text-[11px] text-[#667085] mt-0.5">
                            {report.cellName}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-[#182230]">
                      <div className="font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#667085]" />
                        <span>{report.location}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#23845B] text-sm">
                        +{report.conversions}
                      </span>
                      <div className="text-[10px] text-[#23845B]">Souls Won</div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-bold text-[#182230] text-sm">
                        {report.peopleSpokenTo}
                      </span>
                      <div className="text-[10px] text-[#667085]">Spoken To</div>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-[#667085]">
                      {report.date}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setInspectingReport(report);
                        }}
                        className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 inline-flex items-center justify-center transition-colors shadow-2xs"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION MODAL */}
      {inspectingReport && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-[#E3E8EF] max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#E3E8EF]">
              <div>
                <h3 className="text-base font-bold text-[#142B4A]">Evangelism Outreach Details</h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Cell: {inspectingReport.cellName} &bull; Leader: {inspectingReport.tutorName}
                </p>
              </div>
              <button
                onClick={() => setInspectingReport(null)}
                className="p-1 rounded-lg text-[#667085] hover:text-[#182230]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] text-[#667085]">Conversions (Souls Won)</div>
                <div className="text-base font-bold text-[#23845B]">+{inspectingReport.conversions}</div>
              </div>
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] text-[#667085]">People Spoken To</div>
                <div className="text-base font-bold text-[#182230]">{inspectingReport.peopleSpokenTo}</div>
              </div>
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] text-[#667085]">Contacts Captured</div>
                <div className="text-base font-bold text-[#C6A45A]">{inspectingReport.contactsCaptured}</div>
              </div>
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] text-[#667085]">Interested in Ministry</div>
                <div className="text-base font-bold text-[#142B4A]">{inspectingReport.interestedInMinistry || 0}</div>
              </div>
            </div>

            {inspectingReport.messageUsed && (
              <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] text-xs">
                <div className="font-bold text-[#182230] mb-1">Gospel Scripture / Message Used</div>
                <p className="text-[#667085] whitespace-pre-wrap">{inspectingReport.messageUsed}</p>
              </div>
            )}

            {inspectingReport.notes && (
              <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] text-xs">
                <div className="font-bold text-[#182230] mb-1">Evangelism Notes & Summary</div>
                <p className="text-[#667085] whitespace-pre-wrap">{inspectingReport.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
