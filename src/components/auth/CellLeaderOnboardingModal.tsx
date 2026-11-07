import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ReportService } from '../../services/reportService';
import { Region, Cell } from '../../types';
import { Button } from '../common/Button';
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Target, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Link2
} from 'lucide-react';

export const CellLeaderOnboardingModal: React.FC = () => {
  const { currentUser, completeOnboarding } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [existingCells, setExistingCells] = useState<Cell[]>([]);
  
  // Form State
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [cellName, setCellName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone_number || '');
  const [regionId, setRegionId] = useState('');
  const [meetingDay, setMeetingDay] = useState('Wednesday');
  const [meetingTime, setMeetingTime] = useState('18:30');
  const [venueAddress, setVenueAddress] = useState('');
  const [targetAttendance, setTargetAttendance] = useState('20');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing regions and cells for duplicate detection & autocomplete
  useEffect(() => {
    async function loadData() {
      const [r, c] = await Promise.all([
        ReportService.getRegions(),
        ReportService.getCells(),
      ]);
      setRegions(r);
      setExistingCells(c);
      if (r.length > 0) {
        setRegionId(r[0].id);
      }
    }
    loadData();
  }, []);

  // Duplicate cell detection
  const normalizedInput = cellName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const matchedExistingCell = existingCells.find(c => {
    if (!normalizedInput || normalizedInput.length < 3) return false;
    const norm = (c.normalized_name || c.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    return norm === normalizedInput || norm.includes(normalizedInput) || normalizedInput.includes(norm);
  });

  const handleSelectExistingCell = (cell: Cell) => {
    setCellName(cell.name);
    if (cell.region_id) setRegionId(cell.region_id);
    if (cell.meeting_day) setMeetingDay(cell.meeting_day);
    if (cell.meeting_time) setMeetingTime(cell.meeting_time);
    if (cell.venue_address) setVenueAddress(cell.venue_address);
    if (cell.target_attendance) setTargetAttendance(cell.target_attendance.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !cellName.trim() || !phoneNumber.trim()) {
      setErrorMessage('Please fill in your full name, cell fellowship name, and phone number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await completeOnboarding({
      fullName: fullName.trim(),
      cellName: cellName.trim(),
      phoneNumber: phoneNumber.trim(),
      regionId,
      meetingDay,
      meetingTime,
      venueAddress: venueAddress.trim() || 'Assigned Fellowship Venue',
      targetAttendance: Number(targetAttendance) || 20,
    });

    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to complete registration');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto custom-scrollbar overscroll-contain">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-navy-900 px-6 py-5 text-white relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-400/30">
              <Sparkles className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gold-400 bg-navy-950/60 px-2.5 py-0.5 rounded-full border border-gold-500/20">
                First-Time Cell Leader Setup
              </span>
              <h2 className="text-lg font-extrabold tracking-tight text-white mt-0.5">
                Cell Leader & Fellowship Registration
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Welcome to the FNI Digital Reporting System. Please complete your cell leader profile and register your cell fellowship to begin submitting weekly returns.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar overscroll-contain flex-1">
          {/* Section 1: Leader Details */}
          <div>
            <div className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-gold-500" /> 1. Personal & Contact Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Brother Michael Okon"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp / Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="+234 803 000 0000"
                    className="w-full pl-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Fellowship Cell Details */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-gold-500" /> 2. Cell Fellowship Details
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cell Fellowship Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={cellName}
                onChange={e => setCellName(e.target.value)}
                placeholder="e.g. Grace Cell Victoria Island, Apex Fellowship Ikeja"
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600 font-semibold"
              />
            </div>

            {/* Smart Duplicate Detection & Cell Association Banner */}
            {matchedExistingCell && (
              <div className="mt-2.5 bg-blue-50/90 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 flex items-start gap-2.5 animate-fade-in">
                <Link2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-blue-950">Existing Registered Cell Detected</div>
                  <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                    Found registered cell <strong>"{matchedExistingCell.name}"</strong> ({matchedExistingCell.region_name || 'Assigned Region'}).
                    Submitting will link your profile directly to this existing cell to avoid unnecessary duplicates.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectExistingCell(matchedExistingCell)}
                    className="mt-1.5 text-[11px] font-bold text-blue-700 underline hover:text-blue-900"
                  >
                    Auto-fill cell details from "{matchedExistingCell.name}"
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Region <span className="text-rose-500">*</span>
                </label>
                <select
                  value={regionId}
                  onChange={e => setRegionId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                >
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Weekly Attendance
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={targetAttendance}
                    onChange={e => setTargetAttendance(e.target.value)}
                    className="w-full pl-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meeting Day
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <select
                    value={meetingDay}
                    onChange={e => setMeetingDay(e.target.value)}
                    className="w-full pl-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                  >
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meeting Time
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={e => setMeetingTime(e.target.value)}
                    className="w-full pl-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Venue Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={e => setVenueAddress(e.target.value)}
                  placeholder="Street address, apartment or venue location"
                  className="w-full pl-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full rounded-xl"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration & Enter Portal
            </Button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Your registered cell details will be stored securely in the Supabase database and made accessible to national administration.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
