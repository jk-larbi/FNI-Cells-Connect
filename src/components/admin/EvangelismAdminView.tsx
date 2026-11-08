import React, { useState, useEffect } from 'react';
import { UnifiedReportItem, Cell } from '../../types';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';
import { SoulTargetService } from '../../services/soulTargetService';
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
  ArrowLeft,
  RefreshCw,
  BookOpen,
  DollarSign,
  HeartHandshake,
  Target,
  Sparkles,
} from 'lucide-react';

interface EvangelismAdminViewProps {
  onBack?: () => void;
}

export const EvangelismAdminView: React.FC<EvangelismAdminViewProps> = ({ onBack }) => {
  const [reports, setReports] = useState<UnifiedReportItem[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCellFilter, setSelectedCellFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'evangelism' | 'meeting'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inspectingReport, setInspectingReport] = useState<UnifiedReportItem | null>(null);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);

      const [unifiedQueue, cList] = await Promise.all([
        ReportService.getUnifiedReviewQueue(),
        CellService.getCells(),
      ]);
      setReports(unifiedQueue);
      setCells(cList);
    } catch (err) {
      console.warn('Error loading evangelism & cell harvest reports:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);

    // Live subscription: Auto-refresh whenever a tutor submits a report or updates soul metrics
    const unsubSoul = SoulTargetService.subscribeToLiveSoulTracking(() => {
      loadData(false);
    });

    // Cross-tab storage listener
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key?.includes('meeting_reports') ||
        e.key?.includes('evangelism_reports') ||
        e.key?.includes('reports_store')
      ) {
        loadData(false);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubSoul();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Aggregated KPIs across all submissions
  const totalSouls = reports.reduce((sum, r) => {
    if (r.reportType === 'meeting') {
      return sum + (Number(r.newMembers) || 0);
    }
    return sum + (Number(r.conversions) || 0);
  }, 0);

  const totalReached = reports.reduce((sum, r) => {
    if (r.reportType === 'meeting') {
      return sum + (Number(r.attendance) || 0);
    }
    return sum + (Number(r.peopleSpokenTo) || 0);
  }, 0);

  const totalContacts = reports.reduce((sum, r) => {
    if (r.reportType === 'meeting') {
      return sum + (Number(r.followUpNeeded) || 0);
    }
    return sum + (Number(r.contactsCaptured) || 0);
  }, 0);

  const totalInterested = reports.reduce((sum, r) => {
    if (r.reportType === 'meeting') {
      return sum + (Number(r.newMembers) || 0);
    }
    return sum + (Number(r.interestedInMinistry) || 0);
  }, 0);

  // Counts for category badges
  const evangelismCount = reports.filter(r => r.reportType === 'evangelism').length;
  const meetingCount = reports.filter(r => r.reportType === 'meeting').length;

  const filteredReports = reports.filter(r => {
    // 1. Category filter
    if (categoryFilter === 'evangelism' && r.reportType !== 'evangelism') return false;
    if (categoryFilter === 'meeting' && r.reportType !== 'meeting') return false;

    // 2. Cell filter
    if (selectedCellFilter !== 'All' && r.cellId !== selectedCellFilter) return false;

    // 3. Search query
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return true;

    const cellName = (r.cellName || '').toLowerCase();
    const tutorName = (r.tutorName || '').toLowerCase();
    const location = (
      r.reportType === 'evangelism'
        ? (r.location || '')
        : (r.meetingLocation || (r as any).location || '')
    ).toLowerCase();
    const theme = (r.scripturalTheme || '').toLowerCase();
    const scriptures = (r.scripturesUsed || '').toLowerCase();

    return (
      cellName.includes(q) ||
      tutorName.includes(q) ||
      location.includes(q) ||
      theme.includes(q) ||
      scriptures.includes(q)
    );
  });

  const handleExportCsv = () => {
    const header = [
      'Report Type',
      'Date',
      'Cell Name',
      'Tutor',
      'Location / Venue',
      'Conversions / New Members',
      'People Reached / Attendance',
      'Contacts / Follow-ups',
      'Scriptural Theme',
      'Scriptures Used',
      'Status',
    ];

    const rows = filteredReports.map(r => {
      const typeLabel = r.reportType === 'evangelism' ? 'Evangelism Outreach' : 'Cell Meeting';
      const dateVal = r.reportType === 'evangelism' ? r.date : r.meetingDate;
      const locVal = r.reportType === 'evangelism' ? (r.location || '') : (r.meetingLocation || '');
      const soulsVal = r.reportType === 'evangelism' ? r.conversions : r.newMembers;
      const reachedVal = r.reportType === 'evangelism' ? r.peopleSpokenTo : r.attendance;
      const contactsVal = r.reportType === 'evangelism' ? r.contactsCaptured : r.followUpNeeded;
      const themeVal = (r.scripturalTheme || '').replace(/"/g, '""');
      const scripturesVal = (r.scripturesUsed || '').replace(/"/g, '""');

      return [
        `"${typeLabel}"`,
        `"${dateVal}"`,
        `"${r.cellName || ''}"`,
        `"${r.tutorName || ''}"`,
        `"${locVal.replace(/"/g, '""')}"`,
        soulsVal,
        reachedVal,
        contactsVal,
        `"${themeVal}"`,
        `"${scripturesVal}"`,
        `"${r.status}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FNI_Harvest_Reports_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] hover:text-[#142B4A] mb-2 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Previous</span>
            </button>
          )}
          <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
            Evangelism & Soul-Winning Directorate
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Central repository of all street outreaches, campus missions, cell fellowship returns, and soul-winning harvest.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E3E8EF] text-[#142B4A] text-xs font-bold hover:bg-[#F5F7FA] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="Refresh reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#142B4A] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E3E8EF] text-[#182230] text-xs font-bold hover:bg-[#F5F7FA] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#142B4A]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-xs">
          <div className="text-[11px] font-semibold text-[#667085]">Total Conversions</div>
          <div className="text-2xl font-black text-[#23845B] mt-1">+{totalSouls}</div>
          <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Souls Saved & New Members</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-xs">
          <div className="text-[11px] font-semibold text-[#667085]">People Reached / Attendance</div>
          <div className="text-2xl font-black text-[#182230] mt-1">{totalReached}</div>
          <div className="text-[10px] text-[#667085] font-semibold mt-0.5">Heard the Gospel & Gathered</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-xs">
          <div className="text-[11px] font-semibold text-[#667085]">Contacts Captured</div>
          <div className="text-2xl font-black text-[#C6A45A] mt-1">{totalContacts}</div>
          <div className="text-[10px] text-[#667085] font-semibold mt-0.5">In Follow-up Funnel</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-xs">
          <div className="text-[11px] font-semibold text-[#667085]">Total Reports Filed</div>
          <div className="text-2xl font-black text-[#142B4A] mt-1">{reports.length}</div>
          <div className="text-[10px] text-[#23845B] font-semibold mt-0.5">Outreaches & Cell Returns</div>
        </div>
      </div>

      {/* Filters & Category Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E8EF] shadow-xs space-y-3">
        {/* Category Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-[#142B4A] text-white shadow-xs'
                : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E3E8EF] hover:text-[#142B4A]'
            }`}
          >
            <span>All Harvest & Reports</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              categoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[#E3E8EF] text-[#667085]'
            }`}>
              {reports.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('evangelism')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'evangelism'
                ? 'bg-[#C6A45A] text-[#142B4A] shadow-xs'
                : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E3E8EF] hover:text-[#142B4A]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Evangelism Outreaches</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              categoryFilter === 'evangelism' ? 'bg-[#142B4A]/15 text-[#142B4A]' : 'bg-[#E3E8EF] text-[#667085]'
            }`}>
              {evangelismCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('meeting')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'meeting'
                ? 'bg-[#142B4A] text-white shadow-xs'
                : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E3E8EF] hover:text-[#142B4A]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Cell Fellowship Returns</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              categoryFilter === 'meeting' ? 'bg-white/20 text-white' : 'bg-[#E3E8EF] text-[#667085]'
            }`}>
              {meetingCount}
            </span>
          </button>
        </div>

        {/* Search & Cell Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by cell, tutor, location, theme, or scriptures..."
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
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-xs overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#182230]">
              Harvest Submissions ({filteredReports.length})
            </h2>
            {isRefreshing && (
              <span className="text-[11px] font-semibold text-[#C6A45A] animate-pulse">
                • Updating live...
              </span>
            )}
          </div>
          <span className="text-xs text-[#667085]">
            Real-time returns from cell leaders & soul-winning teams
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
                <th className="py-3 px-4">TYPE & VENUE</th>
                <th className="py-3 px-4">SOULS / CONVERTS</th>
                <th className="py-3 px-4">REACHED / ATTENDANCE</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#667085]">
                    <div className="w-6 h-6 rounded-full border-2 border-[#142B4A] border-t-transparent animate-spin mx-auto mb-2" />
                    <p className="text-xs font-semibold">Loading harvest reports...</p>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#667085]">
                    <Flame className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No harvest or outreach reports found.</p>
                    <p className="text-[11px] text-[#667085] mt-1">
                      Submitted reports from cell leaders appear here immediately.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => {
                  const isEvangelism = report.reportType === 'evangelism';
                  const dateStr = isEvangelism ? report.date : report.meetingDate;
                  const locStr = isEvangelism
                    ? (report.location || 'Outreach Territory')
                    : (report.meetingLocation || (report as any).location || 'Fellowship Venue');
                  const soulsCount = isEvangelism ? Number(report.conversions || 0) : Number(report.newMembers || 0);
                  const reachedCount = isEvangelism ? Number(report.peopleSpokenTo || 0) : Number(report.attendance || 0);

                  return (
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
                              {report.tutorName || 'Cell Leader'}
                            </div>
                            <div className="text-[11px] text-[#667085] mt-0.5">
                              {report.cellName || 'Cell Fellowship'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isEvangelism ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C6A45A]/15 text-[#142B4A] border border-[#C6A45A]/30">
                              <Flame className="w-3 h-3 text-[#C6A45A]" />
                              Outreach
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#142B4A]/10 text-[#142B4A] border border-[#142B4A]/20">
                              <Users className="w-3 h-3 text-[#142B4A]" />
                              Meeting
                            </span>
                          )}
                          <div className="font-medium text-[#182230] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#667085]" />
                            <span className="truncate max-w-[150px]">{locStr}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#23845B] text-sm">
                          +{soulsCount}
                        </span>
                        <div className="text-[10px] text-[#23845B]">
                          {isEvangelism ? 'Souls Won' : 'New Members'}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#182230] text-sm">
                          {reachedCount}
                        </span>
                        <div className="text-[10px] text-[#667085]">
                          {isEvangelism ? 'Spoken To' : 'Attendance'}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-[#667085]">
                        {dateStr || 'Recent'}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          report.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : report.status === 'Needs Correction'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {report.status}
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setInspectingReport(report);
                          }}
                          className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 inline-flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION MODAL */}
      {inspectingReport && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-[#E3E8EF] max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#E3E8EF]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#142B4A] text-[#C6A45A] flex items-center justify-center shrink-0">
                  {inspectingReport.reportType === 'evangelism' ? (
                    <Flame className="w-5 h-5 text-[#C6A45A]" />
                  ) : (
                    <Users className="w-5 h-5 text-[#C6A45A]" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#142B4A]">
                    {inspectingReport.reportType === 'evangelism'
                      ? 'Evangelism Outreach Harvest'
                      : 'Cell Fellowship Harvest & Return'}
                  </h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Cell: {inspectingReport.cellName} &bull; Leader: {inspectingReport.tutorName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingReport(null)}
                className="p-1.5 rounded-lg text-[#667085] hover:text-[#182230] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Grid */}
            {inspectingReport.reportType === 'evangelism' ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Conversions (Souls Won)</div>
                  <div className="text-base font-bold text-[#23845B]">+{inspectingReport.conversions || 0}</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">People Spoken To</div>
                  <div className="text-base font-bold text-[#182230]">{inspectingReport.peopleSpokenTo || 0}</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Contacts Captured</div>
                  <div className="text-base font-bold text-[#C6A45A]">{inspectingReport.contactsCaptured || 0}</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Pre-Set Faith Target</div>
                  <div className="text-base font-bold text-[#142B4A]">{inspectingReport.preSetTarget || 0}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Meeting Attendance</div>
                  <div className="text-base font-bold text-[#142B4A]">{inspectingReport.attendance || 0}</div>
                  <div className="text-[10px] text-[#667085] mt-0.5">Active: {inspectingReport.activeMembers || 0}</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">New Members / Souls</div>
                  <div className="text-base font-bold text-[#23845B]">+{inspectingReport.newMembers || 0}</div>
                  <div className="text-[10px] text-[#23845B] mt-0.5">First-Timers</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Absentees</div>
                  <div className="text-base font-bold text-rose-600">{inspectingReport.absentees || 0}</div>
                  <div className="text-[10px] text-[#667085] mt-0.5">Requires shepherd care</div>
                </div>
                <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085]">Offering Collected</div>
                  <div className="text-base font-bold text-[#C6A45A]">
                    ₵{Number(inspectingReport.offering || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-[#667085] mt-0.5">Auto-Logged</div>
                </div>
              </div>
            )}

            {/* Scriptural Theme & Passages */}
            {(inspectingReport.scripturalTheme || inspectingReport.scripturesUsed || (inspectingReport as any).messageUsed) && (
              <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] text-xs space-y-2">
                <div className="font-bold text-[#182230] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>Message & Scriptural Theme Proclaimed</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {inspectingReport.scripturalTheme && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] block">Theme / Message Shared</span>
                      <span className="font-bold text-[#142B4A]">{inspectingReport.scripturalTheme}</span>
                    </div>
                  )}
                  {inspectingReport.scripturesUsed && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] block">Scriptures Used</span>
                      <span className="font-bold text-[#142B4A]">{inspectingReport.scripturesUsed}</span>
                    </div>
                  )}
                </div>
                {!(inspectingReport.scripturalTheme || inspectingReport.scripturesUsed) && (inspectingReport as any).messageUsed && (
                  <p className="text-[#667085] whitespace-pre-wrap">{(inspectingReport as any).messageUsed}</p>
                )}
              </div>
            )}

            {/* Member Testimonies */}
            {inspectingReport.testimonies && (
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs">
                <div className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Member Testimonies & Breakthroughs</span>
                </div>
                <p className="text-emerald-900 whitespace-pre-wrap leading-relaxed">{inspectingReport.testimonies}</p>
              </div>
            )}

            {/* Tutor Personal Experience / Reflections */}
            {inspectingReport.reportType === 'meeting' && inspectingReport.tutorExperience && (
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                <div className="font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tutor's Personal Assessment & Shepherd Experience</span>
                </div>
                <p className="text-amber-900 whitespace-pre-wrap leading-relaxed">{inspectingReport.tutorExperience}</p>
              </div>
            )}

            {/* Notes & Summaries */}
            {(inspectingReport.reportType === 'evangelism' ? inspectingReport.notes : inspectingReport.tutorNotes) && (
              <div className="p-3.5 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] text-xs">
                <div className="font-bold text-[#182230] mb-1">
                  {inspectingReport.reportType === 'evangelism' ? 'Outreach Notes & Harvest Summary' : 'Lesson Outline & Tutor Notes'}
                </div>
                <p className="text-[#667085] whitespace-pre-wrap leading-relaxed">
                  {inspectingReport.reportType === 'evangelism' ? inspectingReport.notes : inspectingReport.tutorNotes}
                </p>
              </div>
            )}

            {/* Outreach Team Members */}
            {inspectingReport.reportType === 'evangelism' && inspectingReport.teamMembers && inspectingReport.teamMembers.length > 0 && (
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] text-xs">
                <div className="font-bold text-[#182230] mb-0.5">Outreach Team Members</div>
                <div className="text-[#667085]">{inspectingReport.teamMembers.join(', ')}</div>
              </div>
            )}

            {/* Review Status & Feedback */}
            {inspectingReport.reviewerComment && (
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-xs">
                <div className="font-bold text-blue-950 mb-0.5">Leadership Review Feedback</div>
                <p className="text-blue-900 whitespace-pre-wrap">{inspectingReport.reviewerComment}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
