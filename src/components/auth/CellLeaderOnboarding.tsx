import React, { useState, useMemo } from 'react';
import { Cell, UserProfile, UserSession, AuthProvider } from '../../types';
import { 
  Building2, 
  UserCheck, 
  MapPin, 
  Phone, 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Sparkles
} from 'lucide-react';
import { matchOrCreateCell, saveProfile, normalizeCellName } from '../../lib/auth';

interface CellLeaderOnboardingProps {
  initialEmail: string;
  initialName?: string;
  authProvider: AuthProvider;
  existingCells: Cell[];
  onComplete: (session: UserSession) => void;
  onCancel: () => void;
}

export const CellLeaderOnboarding: React.FC<CellLeaderOnboardingProps> = ({
  initialEmail,
  initialName = '',
  authProvider,
  existingCells,
  onComplete,
  onCancel
}) => {
  const [fullName, setFullName] = useState(initialName);
  const [cellName, setCellName] = useState('');
  const [area, setArea] = useState('');
  const [phone, setPhone] = useState('+233 ');
  const [meetingDay, setMeetingDay] = useState('Wednesday');
  const [meetingTime, setMeetingTime] = useState('18:30');
  const [selectedExistingCell, setSelectedExistingCell] = useState<Cell | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Smart matching against existing cells
  const matchingCells = useMemo(() => {
    if (!cellName.trim()) return [];
    const query = normalizeCellName(cellName);
    return existingCells.filter(c => normalizeCellName(c.name).includes(query));
  }, [cellName, existingCells]);

  const exactMatch = useMemo(() => {
    if (!cellName.trim()) return null;
    const query = normalizeCellName(cellName);
    return existingCells.find(c => normalizeCellName(c.name) === query) || null;
  }, [cellName, existingCells]);

  const handleSelectExistingCell = (c: Cell) => {
    setSelectedExistingCell(c);
    setCellName(c.name);
    if (c.area) setArea(c.area);
    if (c.meetingDay) setMeetingDay(c.meetingDay);
    if (c.meetingTime) setMeetingTime(c.meetingTime);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!cellName.trim()) errs.cellName = 'Cell name is required.';
    if (!area.trim()) errs.area = 'Area or city location is required.';
    if (!phone.trim() || phone.trim() === '+233') errs.phone = 'Mobile/WhatsApp contact number is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Call matchOrCreateCell to associate with existing or register new
    const { cell, isExisting } = matchOrCreateCell({
      cellNameInput: cellName.trim(),
      areaInput: area.trim(),
      leaderName: fullName.trim(),
      leaderEmail: initialEmail,
      leaderPhone: phone.trim(),
      meetingDay,
      meetingTime
    });

    const profileId = `user_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const profile: UserProfile = {
      id: profileId,
      email: initialEmail,
      fullName: fullName.trim(),
      role: 'leader',
      cellId: cell.id,
      cellName: cell.name,
      phone: phone.trim(),
      authProvider,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    saveProfile(profile);

    const session: UserSession = {
      id: profileId,
      role: 'leader',
      cellId: cell.id,
      cellName: cell.name,
      name: fullName.trim(),
      email: initialEmail,
      phone: phone.trim(),
      authProvider
    };

    onComplete(session);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[520px] bg-white border border-[#E3E6EB] rounded-xl p-7 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5 pb-2 border-b border-[#E3E6EB]">
          <div className="w-10 h-10 bg-[#0F2447] text-[#B8923A] rounded-lg flex items-center justify-center mx-auto font-bold text-sm shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold text-[#0F2447] font-serif-title">
            Cell Leader Registration
          </h1>
          <p className="text-xs text-[#5B6472]">
            Complete your profile for <strong>{initialEmail}</strong> to link your fellowship
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Full Name */}
          <div>
            <label className="block font-medium text-[#14213D] mb-1">
              Your Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kwame Mensah"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.fullName ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
            </div>
            {errors.fullName && <p className="text-[11px] text-red-600 mt-1">{errors.fullName}</p>}
          </div>

          {/* Cell Name with Autocomplete & Duplicate Handling */}
          <div>
            <label className="block font-medium text-[#14213D] mb-1">
              Cell Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
              <input
                type="text"
                required
                value={cellName}
                onChange={(e) => {
                  setCellName(e.target.value);
                  setSelectedExistingCell(null);
                }}
                placeholder="e.g. Grace Cell, Zion Cell, or enter new"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.cellName ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
            </div>
            {errors.cellName && <p className="text-[11px] text-red-600 mt-1">{errors.cellName}</p>}

            {/* Smart Duplicate Warning / Suggestion */}
            {exactMatch && (
              <div className="mt-2 p-2.5 bg-[#E4F2E8] border border-[#C4E1CC] rounded-lg text-[11px] text-[#1E6B3A] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Existing Cell Recognized:</strong>
                  Your account will be linked to <strong>{exactMatch.name}</strong> ({exactMatch.area}). Duplicate cell creation prevented.
                </div>
              </div>
            )}

            {!exactMatch && matchingCells.length > 0 && !selectedExistingCell && (
              <div className="mt-2 p-2 bg-[#F6F7F9] border border-[#E3E6EB] rounded-lg text-[11px] text-[#5B6472]">
                <span className="block font-medium text-[#0F2447] mb-1">Did you mean an existing registered cell?</span>
                <div className="flex flex-wrap gap-1.5">
                  {matchingCells.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectExistingCell(c)}
                      className="px-2 py-0.5 bg-white border border-[#E3E6EB] rounded hover:border-[#B8923A] text-[#0F2447] font-medium"
                    >
                      {c.name} ({c.area})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Area / Location */}
          <div>
            <label className="block font-medium text-[#14213D] mb-1">
              Area / City Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
              <input
                type="text"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Cape Coast, Takoradi, East Legon"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.area ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
            </div>
            {errors.area && <p className="text-[11px] text-red-600 mt-1">{errors.area}</p>}
          </div>

          {/* Phone / WhatsApp */}
          <div>
            <label className="block font-medium text-[#14213D] mb-1">
              WhatsApp / Mobile Phone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233 24 123 4567"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg bg-white text-[#14213D] font-mono focus:outline-none focus:ring-1 focus:ring-[#B8923A] ${
                  errors.phone ? 'border-red-500' : 'border-[#E3E6EB]'
                }`}
              />
            </div>
            {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
          </div>

          {/* Meeting Day & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#14213D] mb-1">
                Meeting Day
              </label>
              <select
                value={meetingDay}
                onChange={(e) => setMeetingDay(e.target.value)}
                className="w-full px-2.5 py-2 border border-[#E3E6EB] rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A]"
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#14213D] mb-1">
                Meeting Time
              </label>
              <input
                type="text"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                placeholder="18:30"
                className="w-full px-3 py-2 border border-[#E3E6EB] rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A]"
              />
            </div>
          </div>

          <div className="pt-3 space-y-2 border-t border-[#E3E6EB]">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded-lg transition-colors shadow-xs"
            >
              <span>Complete Registration & Enter Dashboard</span>
              <ArrowRight className="w-4 h-4 text-[#B8923A]" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full text-center text-[11px] text-[#5B6472] hover:text-[#0F2447] py-1"
            >
              Sign Out & Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
