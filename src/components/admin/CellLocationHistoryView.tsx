import React, { useState, useEffect, useMemo } from 'react';
import { CellLocationRecord, Cell } from '../../types';
import { CellLocationService } from '../../services/cellLocationService';
import { CellService } from '../../services/cellService';
import { SupabaseService } from '../../services/supabaseService';
import { useAuth } from '../../context/AuthContext';
import {
  MapPin,
  Search,
  Filter,
  Plus,
  Calendar,
  Users,
  Building,
  Download,
  Printer,
  FileText,
  Clock,
  History,
  X,
  Edit2,
  Trash2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface CellLocationHistoryViewProps {
  onBack?: () => void;
}

export const CellLocationHistoryView: React.FC<CellLocationHistoryViewProps> = ({ onBack }) => {
  const { currentUser, isAdmin } = useAuth();
  const [records, setRecords] = useState<CellLocationRecord[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCellId, setSelectedCellId] = useState('all');
  const [selectedLeaderId, setSelectedLeaderId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CellLocationRecord | null>(null);
  const [formCellId, setFormCellId] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formMeetingDate, setFormMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLeaderName, setFormLeaderName] = useState('');
  const [formLeaderId, setFormLeaderId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Cell Timeline Inspection Modal
  const [selectedCellForTimeline, setSelectedCellForTimeline] = useState<Cell | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [historyData, cellList, profileList] = await Promise.all([
        CellLocationService.getLocationHistory(),
        CellService.getCells(),
        SupabaseService.getProfiles(),
      ]);
      setRecords(historyData);
      setCells(cellList);
      setProfiles(profileList || []);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered Records (Chronological newest first)
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (selectedCellId !== 'all' && r.cell_id !== selectedCellId) return false;
      if (selectedLeaderId !== 'all' && r.leader_id !== selectedLeaderId) return false;
      if (startDate && r.meeting_date < startDate) return false;
      if (endDate && r.meeting_date > endDate) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          r.cell_name.toLowerCase().includes(q) ||
          r.venue.toLowerCase().includes(q) ||
          r.leader_name.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [records, selectedCellId, selectedLeaderId, startDate, endDate, searchQuery]);

  // Unique venues count
  const uniqueVenuesCount = useMemo(() => {
    return new Set(records.map(r => r.venue.trim().toLowerCase())).size;
  }, [records]);

  // Open Create / Edit Modal
  const handleOpenModal = (rec?: CellLocationRecord) => {
    if (rec) {
      setEditingRecord(rec);
      setFormCellId(rec.cell_id);
      setFormVenue(rec.venue);
      setFormMeetingDate(rec.meeting_date);
      setFormLeaderName(rec.leader_name);
      setFormLeaderId(rec.leader_id || '');
      setFormNotes(rec.notes || '');
    } else {
      setEditingRecord(null);
      setFormCellId(cells[0]?.id || '');
      setFormVenue('');
      setFormMeetingDate(new Date().toISOString().split('T')[0]);
      const defaultLeader = cells[0]?.leader_name || currentUser.full_name || '';
      setFormLeaderName(defaultLeader);
      setFormLeaderId(cells[0]?.leader_id || currentUser.id);
      setFormNotes('');
    }
    setIsModalOpen(true);
  };

  const handleCellChangeInForm = (cellId: string) => {
    setFormCellId(cellId);
    const c = cells.find(item => item.id === cellId);
    if (c) {
      if (c.leader_name) setFormLeaderName(c.leader_name);
      if (c.leader_id) setFormLeaderId(c.leader_id);
      if (c.location && !formVenue) setFormVenue(c.location);
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCellId || !formVenue.trim()) {
      alert('Please select a cell and enter the meeting location/venue.');
      return;
    }
    const targetCell = cells.find(c => c.id === formCellId);
    const cellName = targetCell ? targetCell.name : 'Fellowship Cell';

    setIsSaving(true);
    try {
      if (editingRecord) {
        await CellLocationService.updateLocation(editingRecord.id, {
          venue: formVenue.trim(),
          meeting_date: formMeetingDate,
          leader_name: formLeaderName.trim(),
          notes: formNotes.trim(),
        });
      } else {
        await CellLocationService.recordLocation(
          {
            cell_id: formCellId,
            cell_name: cellName,
            venue: formVenue.trim(),
            meeting_date: formMeetingDate,
            leader_id: formLeaderId || currentUser.id,
            leader_name: formLeaderName.trim() || currentUser.full_name || 'Cell Leader',
            notes: formNotes.trim(),
          },
          { id: currentUser.id, name: currentUser.full_name }
        );
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save location record:', err);
      alert('Failed to save record. Please check network connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this historical location record?')) return;
    try {
      await CellLocationService.deleteLocation(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete location record:', err);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No location history records to export.');
      return;
    }
    const headers = ['Cell Name', 'Meeting Date', 'Location / Venue', 'Cell Leader / Tutor', 'Notes', 'Logged At'];
    const rows = filteredRecords.map(r => [
      `"${r.cell_name.replace(/"/g, '""')}"`,
      r.meeting_date,
      `"${r.venue.replace(/"/g, '""')}"`,
      `"${r.leader_name.replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      r.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FNI_Cell_Location_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#142B4A]/10 text-[#142B4A] dark:bg-white/10 dark:text-white flex items-center justify-center shrink-0 border border-[#142B4A]/15">
            <MapPin className="w-6 h-6 text-[#C6A45A]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#142B4A]/5 text-[#142B4A] text-[10px] font-bold uppercase tracking-wider mb-1">
              <span>Cells Directorate &bull; Historical Registry</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#142B4A] dark:text-white tracking-tight">
              Cell Location History
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] dark:text-slate-400 mt-0.5">
              Permanent chronological archive of physical venues and meeting locations across all registered cells.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] text-xs font-bold text-[#142B4A] dark:text-white hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#C6A45A]" />
              <span>Record Location</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Key Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-[#667085] dark:text-slate-400 mb-1">
            <History className="w-3.5 h-3.5 text-[#C6A45A] shrink-0" />
            <span className="truncate">Total Records</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#142B4A] dark:text-white">
            {isLoading ? '—' : records.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#667085] dark:text-slate-400 mt-0.5 truncate">Historical entries preserved</div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-[#667085] dark:text-slate-400 mb-1">
            <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">Cells Tracked</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#142B4A] dark:text-white">
            {isLoading ? '—' : cells.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#667085] dark:text-slate-400 mt-0.5 truncate">Active fellowship cells</div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-[#667085] dark:text-slate-400 mb-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">Unique Venues</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#142B4A] dark:text-white">
            {isLoading ? '—' : uniqueVenuesCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#667085] dark:text-slate-400 mt-0.5 truncate">Documented locations</div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-[#667085] dark:text-slate-400 mb-1">
            <Users className="w-3.5 h-3.5 text-violet-600 shrink-0" />
            <span className="truncate">Tutors & Leaders</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#142B4A] dark:text-white">
            {isLoading ? '—' : profiles.filter(p => p.role === 'cell_leader' || p.role === 'tutor').length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#667085] dark:text-slate-400 mt-0.5 truncate">Cell shepherds</div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by cell name, venue address, tutor leader, or notes..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Cell Filter */}
          <div className="w-full md:w-56">
            <select
              value={selectedCellId}
              onChange={e => setSelectedCellId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            >
              <option value="all">All Fellowship Cells</option>
              {cells.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div className="w-full md:w-40">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
              title="Start Date"
            />
          </div>

          {/* Date Range End */}
          <div className="w-full md:w-40">
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
              title="End Date"
            />
          </div>

          {(selectedCellId !== 'all' || searchQuery || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedCellId('all');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Location History Records Table & List */}
      <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#C6A45A]" />
            <h2 className="text-sm font-bold text-[#142B4A] dark:text-white">
              Chronological Location History ({filteredRecords.length})
            </h2>
          </div>
          <span className="text-xs text-[#667085]">
            Newest Records First
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#667085]">
            <div className="w-8 h-8 border-2 border-[#142B4A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading cell location historical data...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center text-[#667085]">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#182230] dark:text-white">No Location History Found</h3>
            <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
              {records.length === 0
                ? 'No location records have been logged in the system yet. Click "Record Location" above to add the first physical meeting venue.'
                : 'No records match the active search or filter criteria. Try resetting the filters.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (Dedicated for smartphones & narrow screens) */}
            <div className="block md:hidden divide-y divide-[#E3E8EF] dark:divide-[#26384d]">
              {filteredRecords.map(rec => (
                <div key={rec.id} className="p-4 space-y-2.5 hover:bg-[#F5F7FA] dark:hover:bg-[#172437]/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-[#142B4A] dark:text-white">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>{rec.cell_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#667085] dark:text-slate-400 shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>{new Date(rec.meeting_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 text-xs text-[#182230] dark:text-slate-200">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{rec.venue}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 text-[#667085] dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#C6A45A] shrink-0" />
                      <span>Leader: <strong className="text-[#142B4A] dark:text-slate-200">{rec.leader_name}</strong></span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(rec)}
                          className="p-1.5 rounded-lg text-[#667085] hover:text-[#142B4A] hover:bg-slate-100 dark:hover:bg-[#203D63] transition-colors cursor-pointer"
                          title="Edit Record"
                          aria-label="Edit Record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Record"
                          aria-label="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {rec.notes && (
                    <div className="text-[11px] text-[#667085] dark:text-slate-400 italic bg-[#F8FAFC] dark:bg-[#152238] p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{rec.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View (For tablets, laptops & desktop screens) */}
            <div className="hidden md:block table-scroll-container custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] dark:bg-[#172437] text-[#667085] uppercase tracking-wider text-[10px] font-bold border-b border-[#E3E8EF] dark:border-[#26384d]">
                  <tr>
                    <th className="py-3 px-4">Meeting Date</th>
                    <th className="py-3 px-4">Cell Fellowship</th>
                    <th className="py-3 px-4">Location / Venue</th>
                    <th className="py-3 px-4">Tutor / Cell Leader</th>
                    <th className="py-3 px-4">Historical Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EF] dark:divide-[#26384d]">
                  {filteredRecords.map(rec => (
                    <tr
                      key={rec.id}
                      className="hover:bg-[#F5F7FA] dark:hover:bg-[#172437]/60 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-bold text-[#142B4A] dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>{new Date(rec.meeting_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#182230] dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>{rec.cell_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#182230] dark:text-slate-200">
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="max-w-xs truncate">{rec.venue}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#667085] dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-[#C6A45A] shrink-0" />
                          <span>{rec.leader_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#667085] dark:text-slate-400 text-[11px] max-w-xs truncate">
                        {rec.notes || <span className="text-slate-400 italic">No notes</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenModal(rec)}
                                className="p-1.5 rounded-lg text-[#667085] hover:text-[#142B4A] hover:bg-slate-100 dark:hover:bg-[#203D63] transition-colors cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(rec.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 5. Add / Edit Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111c2d] w-full max-w-lg rounded-3xl shadow-2xl border border-[#E3E8EF] dark:border-[#26384d] overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#142B4A] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 text-[#C6A45A] flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white">
                    {editingRecord ? 'Edit Cell Location Record' : 'Record Cell Location History'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Document the physical meeting venue and responsible tutor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRecord} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Select Cell */}
              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white mb-1.5">
                  Fellowship Cell <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCellId}
                  onChange={e => handleCellChangeInForm(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                >
                  <option value="">Select a cell...</option>
                  {cells.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.location || 'No location'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Location / Venue */}
              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white mb-1.5">
                  Meeting Location / Venue <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formVenue}
                  onChange={e => setFormVenue(e.target.value)}
                  placeholder="e.g. Fellowship Annex Hall B, 12 Ring Road Central, Accra"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                />
              </div>

              {/* Meeting Date */}
              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white mb-1.5">
                  Meeting Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formMeetingDate}
                  onChange={e => setFormMeetingDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                />
              </div>

              {/* Responsible Tutor / Cell Leader */}
              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white mb-1.5">
                  Responsible Tutor / Cell Leader <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formLeaderName}
                  onChange={e => setFormLeaderName(e.target.value)}
                  placeholder="Tutor's Full Name"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                />
              </div>

              {/* Additional Historical Notes */}
              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-white mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Relocated to this venue due to space expansion. Venue approved by administration."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] text-xs font-semibold text-[#667085] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? 'Saving Record...' : editingRecord ? 'Update Record' : 'Save Location History'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
