import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CellService } from '../../services/cellService';
import { Cell, CellMeetingReport, EvangelismReport } from '../../types';
import { ReportService } from '../../services/reportService';
import { FollowUpService } from '../../services/followUpService';
import {
  Building,
  MapPin,
  Calendar,
  Clock,
  Users,
  UserCheck,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Flame,
  ArrowLeft,
} from 'lucide-react';

interface MyCellViewProps {
  onBack?: () => void;
}

export const MyCellView: React.FC<MyCellViewProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [cell, setCell] = useState<Cell | null>(null);
  const [meetingReports, setMeetingReports] = useState<CellMeetingReport[]>([]);
  const [evangReports, setEvangReports] = useState<EvangelismReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editable details
  const [cellName, setCellName] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [meetingDay, setMeetingDay] = useState('Wednesday');
  const [meetingTime, setMeetingTime] = useState('18:30');
  const [targetAttendance, setTargetAttendance] = useState<number | string>(25);
  const [totalMembers, setTotalMembers] = useState<number | string>(10);
  const [activeMembers, setActiveMembers] = useState<number | string>(8);
  const [newMembers, setNewMembers] = useState<number | string>(2);
  const [requiringFollowUp, setRequiringFollowUp] = useState<number | string>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const c = await CellService.getCellForTutor(currentUser);
        setCell(c);
        setCellName(currentUser.cell_name || c.name || '');
        setMeetingLocation(c.meeting_location || c.venue_address || c.location || '');
        setMeetingDay(c.meeting_day || 'Wednesday');
        setMeetingTime(c.meeting_time || '18:30');
        setVenueAddress(c.venue_address || c.location || '');
        setTargetAttendance(c.target_attendance || 25);
        setTotalMembers(c.total_members !== undefined ? c.total_members : 10);
        setActiveMembers(c.active_members !== undefined ? c.active_members : 8);
        setNewMembers(c.new_members !== undefined ? c.new_members : 2);

        const [mList, eList, cntList] = await Promise.all([
          ReportService.getCellMeetingReports({ cellId: c.id }),
          ReportService.getEvangelismReports({ cellId: c.id }),
          FollowUpService.getContacts(c.id),
        ]);
        setMeetingReports(mList);
        setEvangReports(eList);
        const pendingFollowUpCount = cntList.filter(
          ct => ct.followUpStatus === 'Follow-up required' || ct.followUpStatus === 'Not contacted' || ct.followUpStatus === 'Follow-up Pending'
        ).length;
        setRequiringFollowUp(c.requiring_follow_up !== undefined ? c.requiring_follow_up : pendingFollowUpCount);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [currentUser]);

  const handleSaveCellDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cell) return;
    setIsSaving(true);
    setSaveNotice('');
    try {
      const updated: Cell = {
        ...cell,
        name: cellName.trim() || cell.name,
        location: meetingLocation.trim() || cell.location,
        meeting_location: meetingLocation.trim(),
        venue_address: venueAddress.trim() || meetingLocation.trim(),
        meeting_day: meetingDay,
        meeting_time: meetingTime,
        target_attendance: Number(targetAttendance) || 25,
        total_members: Number(totalMembers) || 0,
        active_members: Number(activeMembers) || 0,
        new_members: Number(newMembers) || 0,
        requiring_follow_up: Number(requiringFollowUp) || 0,
      };
      await CellService.updateCell(updated);
      setCell(updated);
      setSaveNotice('Cell membership and meeting details updated successfully.');
      setTimeout(() => setSaveNotice(''), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !cell) {
    return (
      <div className="py-24 text-center text-xs text-[#667085] font-medium">
        Loading cell profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          My Cell Profile & Details
        </h1>
        <p className="text-xs text-[#667085] mt-0.5">
          View your fellowship cell's official directory record, meeting venue, and historical vital stats.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cell Information & Edit Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-[#E3E8EF]">
            <div className="w-12 h-12 rounded-2xl bg-[#142B4A] flex items-center justify-center text-[#C6A45A] font-bold text-lg shadow-sm">
              {(currentUser.cell_name || cell.name || 'FC').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#142B4A]">{currentUser.cell_name || cell.name}</h2>
              <p className="text-xs text-[#667085]">
                Campus / Location: <span className="font-semibold text-[#182230]">{cell.location}</span> &bull; Code: <span className="font-mono">{cell.code || 'FNI-CEL'}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveCellDetails} className="space-y-4 text-xs">
            {saveNotice && (
              <div className="p-3 bg-emerald-50 border-l-4 border-[#23845B] text-[#23845B] rounded-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveNotice}</span>
              </div>
            )}

            {/* Basic Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#182230] mb-1">Cell Fellowship Name</label>
                <input
                  type="text"
                  value={cellName}
                  onChange={e => setCellName(e.target.value)}
                  required
                  placeholder="e.g. Dominion Cell Legon"
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none font-semibold text-[#142B4A]"
                />
                <p className="text-[10px] text-[#667085] mt-1">
                  Registered Fellowship: <strong className="text-[#142B4A]">{currentUser.cell_name || cell.name}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">Assigned Tutor</label>
                <input
                  type="text"
                  disabled
                  value={cell.leader_name || currentUser.full_name}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] bg-[#F5F7FA] text-[#667085] cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {/* Meeting Location & Venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#182230] mb-1">Meeting Location / Campus</label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={e => setMeetingLocation(e.target.value)}
                  required
                  placeholder="e.g. University of Ghana, Legon"
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">Venue / Physical Address</label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={e => setVenueAddress(e.target.value)}
                  required
                  placeholder="e.g. Hall 4 Common Room, Legon Campus"
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Feature 1: Cell Membership Statistics & Pastoral Details */}
            <div className="p-4 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#142B4A] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C6A45A]" />
                  Cell Membership Roster & Pastoral Care Details
                </span>
                <span className="text-[10px] text-[#667085]">
                  Managed in Cell Portal &bull; Weekly reports remain quick and simple
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-[#E3E8EF]">
                  <label className="block font-bold text-[#182230] mb-1">Total Members</label>
                  <input
                    type="number"
                    min={1}
                    value={totalMembers}
                    onChange={e => setTotalMembers(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    onBlur={() => { if (totalMembers === '' || Number(totalMembers) < 1) setTotalMembers(1); }}
                    required
                    className="w-full text-base font-extrabold text-[#142B4A] bg-[#F5F7FA] border border-[#E3E8EF] rounded-lg p-2 focus:bg-white"
                  />
                  <span className="text-[10px] text-[#667085] mt-0.5 block">Official registered roll</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#E3E8EF]">
                  <label className="block font-bold text-[#182230] mb-1">Active Members</label>
                  <input
                    type="number"
                    min={0}
                    value={activeMembers}
                    onChange={e => setActiveMembers(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    required
                    className="w-full text-base font-extrabold text-[#23845B] bg-[#F5F7FA] border border-[#E3E8EF] rounded-lg p-2 focus:bg-white"
                  />
                  <span className="text-[10px] text-[#667085] mt-0.5 block">Regular participants</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#E3E8EF]">
                  <label className="block font-bold text-[#182230] mb-1">New Members</label>
                  <input
                    type="number"
                    min={0}
                    value={newMembers}
                    onChange={e => setNewMembers(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    required
                    className="w-full text-base font-extrabold text-[#C6A45A] bg-[#F5F7FA] border border-[#E3E8EF] rounded-lg p-2 focus:bg-white"
                  />
                  <span className="text-[10px] text-[#667085] mt-0.5 block">Recently integrated</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#E3E8EF]">
                  <label className="block font-bold text-[#182230] mb-1">Requiring Follow-up</label>
                  <input
                    type="number"
                    min={0}
                    value={requiringFollowUp}
                    onChange={e => setRequiringFollowUp(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    required
                    className="w-full text-base font-extrabold text-[#C74646] bg-[#F5F7FA] border border-[#E3E8EF] rounded-lg p-2 focus:bg-white"
                  />
                  <span className="text-[10px] text-[#667085] mt-0.5 block">Souls & brethren to visit</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-[#182230] mb-1">Weekly Meeting Day</label>
                <select
                  value={meetingDay}
                  onChange={e => setMeetingDay(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] bg-white text-[#182230]"
                >
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">Meeting Time (GMT)</label>
                <input
                  type="text"
                  value={meetingTime}
                  onChange={e => setMeetingTime(e.target.value)}
                  required
                  placeholder="18:30"
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">Target Attendance</label>
                <input
                  type="number"
                  value={targetAttendance}
                  onChange={e => setTargetAttendance(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                  onBlur={() => { if (targetAttendance === '' || Number(targetAttendance) < 1) setTargetAttendance(15); }}
                  min={1}
                  required
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] transition-colors shadow-sm flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-[#C6A45A]" />
                <span>{isSaving ? 'Updating...' : 'Save Cell Schedule & Venue'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Vital Summary Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E3E8EF] p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-[#142B4A] uppercase tracking-wider">
              Cell Historical Aggregates
            </h3>

            <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
              <div className="text-[10px] text-[#667085]">Total Meeting Returns</div>
              <div className="text-xl font-bold text-[#142B4A] mt-0.5">{meetingReports.length}</div>
            </div>

            <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
              <div className="text-[10px] text-[#667085]">Total Evangelism Outreaches</div>
              <div className="text-xl font-bold text-[#23845B] mt-0.5">{evangReports.length}</div>
            </div>

            <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
              <div className="text-[10px] text-[#667085]">Conversions Recorded</div>
              <div className="text-xl font-bold text-[#C6A45A] mt-0.5">
                +{evangReports.reduce((s, e) => s + (Number(e.conversions) || 0), 0)} souls
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
