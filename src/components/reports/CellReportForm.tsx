import React, { useState, useEffect } from 'react';
import { Cell, ReportingPeriod, CellReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ReportService } from '../../services/reportService';
import {
  Users,
  Flame,
  UserCheck,
  Calendar,
  HeartHandshake,
  CheckCircle,
  Save,
  Send,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '../common/Button';

interface CellReportFormProps {
  initialReport?: CellReport | null;
  onSuccess: (report: CellReport) => void;
  onCancel?: () => void;
}

export const CellReportForm: React.FC<CellReportFormProps> = ({
  initialReport,
  onSuccess,
  onCancel,
}) => {
  const { currentUser } = useAuth();
  const { dispatchNotification } = useNotifications();

  const [cells, setCells] = useState<Cell[]>([]);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State - Starts completely clean without mockup dummy defaults
  const [formData, setFormData] = useState({
    cell_id: initialReport?.cell_id || currentUser.cell_id || '',
    period_id: initialReport?.period_id || 'prd-w45',
    members_present: initialReport?.members_present ?? 0,
    visitors_count: initialReport?.visitors_count ?? 0,
    souls_won: initialReport?.souls_won ?? 0,
    souls_won_details: initialReport?.souls_won_details || '',
    evangelism_outreaches_held: initialReport?.evangelism_outreaches_held ?? 0,
    evangelism_locations: initialReport?.evangelism_locations || '',
    follow_ups_conducted: initialReport?.follow_ups_conducted ?? 0,
    first_timers_contacted: initialReport?.first_timers_contacted ?? 0,
    converts_established: initialReport?.converts_established ?? 0,
    meeting_held: initialReport?.meeting_held ?? true,
    meeting_date: initialReport?.meeting_date || new Date().toISOString().split('T')[0],
    meeting_topic: initialReport?.meeting_topic || '',
    offering_amount: initialReport?.offering_amount ?? 0,
    prayer_requests: initialReport?.prayer_requests || '',
    testimonies: initialReport?.testimonies || '',
    challenges_faced: initialReport?.challenges_faced || '',
    additional_remarks: initialReport?.additional_remarks || '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [cList, pList] = await Promise.all([
          ReportService.getCells(),
          ReportService.getPeriods(),
        ]);
        setCells(cList);
        setPeriods(pList);
        if (!initialReport?.cell_id && currentUser.cell_id) {
          setFormData(prev => ({ ...prev, cell_id: currentUser.cell_id || cList[0]?.id || '' }));
        }
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    loadData();
  }, [currentUser, initialReport]);

  const totalAttendance = Number(formData.members_present || 0) + Number(formData.visitors_count || 0);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.cell_id) newErrors.cell_id = 'Please select a cell group';
      if (!formData.period_id) newErrors.period_id = 'Please select the reporting cycle';
      if (formData.members_present < 0) newErrors.members_present = 'Cannot be negative';
      if (formData.visitors_count < 0) newErrors.visitors_count = 'Cannot be negative';
    }

    if (step === 2) {
      if (formData.souls_won < 0) newErrors.souls_won = 'Cannot be negative';
      if (formData.souls_won > 0 && !formData.souls_won_details.trim()) {
        newErrors.souls_won_details = 'Please briefly state the names or notes for the souls won';
      }
      if (formData.evangelism_outreaches_held < 0) {
        newErrors.evangelism_outreaches_held = 'Cannot be negative';
      }
    }

    if (step === 3) {
      if (formData.meeting_held && !formData.meeting_topic.trim()) {
        newErrors.meeting_topic = 'Please provide the meeting topic / teaching focus';
      }
      if (!formData.meeting_date) {
        newErrors.meeting_date = 'Please select the meeting date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(4, prev + 1));
    }
  };

  const handlePrev = () => {
    setActiveStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft) {
      // Validate all steps
      for (let s = 1; s <= 3; s++) {
        if (!validateStep(s)) {
          setActiveStep(s);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const selectedCell = cells.find(c => c.id === formData.cell_id);
      const selectedPeriod = periods.find(p => p.id === formData.period_id);

      const savedReport = await ReportService.submitReport(
        {
          id: initialReport?.id,
          ...formData,
          total_attendance: totalAttendance,
          cell_name: selectedCell?.name,
          region_id: selectedCell?.region_id,
          region_name: selectedCell?.region_name,
          period_name: selectedPeriod?.name,
          submitted_by: currentUser.id,
          submitted_by_name: currentUser.full_name,
        },
        isDraft
      );

      dispatchNotification(
        isDraft ? 'Draft Report Saved' : 'Weekly Report Submitted',
        `${selectedCell?.name || 'Cell'} report for ${selectedPeriod?.name || 'Week'} has been ${isDraft ? 'saved as draft' : 'submitted successfully for regional review'}.`,
        'report_submitted',
        'in_app'
      );

      onSuccess(savedReport);
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Failed to submit report. Please check your inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMetadata) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Loading organizational reporting schema...
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Cell & Attendance', icon: Users },
    { number: 2, title: 'Evangelism & Souls', icon: Flame },
    { number: 3, title: 'Meeting & Follow-up', icon: Calendar },
    { number: 4, title: 'Pastoral & Remarks', icon: HeartHandshake },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
      {/* Header Banner */}
      <div className="bg-navy-900 text-white p-6 sm:p-7 border-b border-navy-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30 uppercase tracking-wide">
              Official Ministry Return
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
              Weekly Cell Ministry Report
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Structured reporting form for Forerunners Network International fellowship units
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-navy-800 border border-navy-700 px-3 py-1.5 rounded-lg text-slate-300">
              Submitter: <strong className="text-white">{currentUser.full_name}</strong>
            </span>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          {steps.map(step => {
            const Icon = step.icon;
            const isCompleted = activeStep > step.number;
            const isCurrent = activeStep === step.number;
            return (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(step.number)}
                className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors text-xs ${
                  isCurrent
                    ? 'bg-navy-800 text-gold-400 border border-gold-500/40 font-semibold'
                    : isCompleted
                    ? 'bg-navy-950/60 text-slate-200 hover:bg-navy-800'
                    : 'bg-navy-950/30 text-slate-400 hover:bg-navy-950/60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-gold-500 text-navy-950'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-navy-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : step.number}
                </div>
                <span className="hidden sm:inline truncate">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Body */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(false);
        }}
        className="p-6 space-y-6"
      >
        {/* ================= STEP 1: Cell & Attendance ================= */}
        {activeStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-gold-600" />
                Section 1: Cell Identification & Attendance Metrics
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Designate the reporting fellowship unit, target period and verified turnout
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Cell Fellowship <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.cell_id}
                  onChange={e => setFormData({ ...formData, cell_id: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                >
                  {cells.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.region_name || c.code})
                    </option>
                  ))}
                </select>
                {errors.cell_id && <p className="text-[11px] text-rose-600 mt-1">{errors.cell_id}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reporting Cycle / Period <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.period_id}
                  onChange={e => setFormData({ ...formData, period_id: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                >
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.is_open ? '(Active Cycle)' : '(Closed Cycle)'}
                    </option>
                  ))}
                </select>
                {errors.period_id && <p className="text-[11px] text-rose-600 mt-1">{errors.period_id}</p>}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
                Meeting Attendance Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Regular Members Present
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.members_present}
                    onChange={e =>
                      setFormData({ ...formData, members_present: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full text-sm font-semibold rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                  />
                  {errors.members_present && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.members_present}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    First-Time Visitors Recorded
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.visitors_count}
                    onChange={e =>
                      setFormData({ ...formData, visitors_count: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full text-sm font-semibold rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                  />
                  {errors.visitors_count && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.visitors_count}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Total Turnout (Auto Calculated)
                  </label>
                  <div className="w-full text-base font-bold bg-navy-900 text-gold-400 rounded-lg border border-navy-800 p-2 text-center">
                    {totalAttendance} Attendees
                  </div>
                  <span className="text-[10px] text-slate-500 text-center block mt-1">
                    {formData.members_present} members + {formData.visitors_count} visitors
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: Evangelism & Souls ================= */}
        {activeStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-gold-600" />
                Section 2: Evangelism Outreaches & Souls Won
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Document great commission field activities and salvation harvests
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Souls Won to Christ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.souls_won}
                    onChange={e =>
                      setFormData({ ...formData, souls_won: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full text-sm font-semibold rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                  />
                </div>
                {errors.souls_won && <p className="text-[11px] text-rose-600 mt-1">{errors.souls_won}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Evangelism Outreaches Held
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.evangelism_outreaches_held}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      evangelism_outreaches_held: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-full text-sm font-semibold rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Souls Won Names & Details {formData.souls_won > 0 && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder="List individual names, contact notes, or contexts (e.g. John Doe, Sarah Adams accepted Christ during Friday market outreach)..."
                value={formData.souls_won_details}
                onChange={e => setFormData({ ...formData, souls_won_details: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-3 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
              />
              {errors.souls_won_details && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.souls_won_details}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Evangelism Locations / Target Zones
              </label>
              <input
                type="text"
                placeholder="e.g. University bus stop, City shopping mall, Residential estates..."
                value={formData.evangelism_locations}
                onChange={e => setFormData({ ...formData, evangelism_locations: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 3: Meeting & Follow-up ================= */}
        {activeStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold-600" />
                Section 3: Cell Meeting Details & Follow-up Discipleship
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record meeting execution, teaching message, and ongoing convert care
              </p>
            </div>

            {/* Meeting Held Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-xs font-semibold text-slate-800">Was Weekly Cell Meeting Held?</div>
                <div className="text-[11px] text-slate-500">Confirm physical or hybrid assembly</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.meeting_held}
                  onChange={e => setFormData({ ...formData, meeting_held: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy-800"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meeting Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.meeting_date}
                  onChange={e => setFormData({ ...formData, meeting_date: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
                {errors.meeting_date && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.meeting_date}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Offering / Seed Amount (Local Currency)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.offering_amount}
                  onChange={e =>
                    setFormData({ ...formData, offering_amount: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Teaching Topic / Scripture Focus <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Walking in Kingdom Authority & Power (Colossians 2:6-10)..."
                value={formData.meeting_topic}
                onChange={e => setFormData({ ...formData, meeting_topic: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
              />
              {errors.meeting_topic && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.meeting_topic}</p>
              )}
            </div>

            {/* Follow-up Metrics */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
                Follow-up & Convert Retention Pipeline
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Follow-ups Conducted
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.follow_ups_conducted}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        follow_ups_conducted: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-full text-sm font-semibold rounded-lg border border-slate-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    First-Timers Contacted
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.first_timers_contacted}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        first_timers_contacted: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-full text-sm font-semibold rounded-lg border border-slate-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Converts Established In Class
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.converts_established}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        converts_established: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-full text-sm font-semibold rounded-lg border border-slate-300 p-2.5"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: Pastoral & Remarks ================= */}
        {activeStep === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-gold-600" />
                Section 4: Pastoral Notes, Testimonies & Remarks
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Feed spiritual intelligence, answered prayers, and operational challenges to leadership
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Testimonies Recorded
                </label>
                <textarea
                  rows={3}
                  placeholder="Record miraculous provisions, physical healings, answered prayers..."
                  value={formData.testimonies}
                  onChange={e => setFormData({ ...formData, testimonies: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-3 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prayer Requests (Pastoral Care)
                </label>
                <textarea
                  rows={3}
                  placeholder="Specific prayer needs for cell members requiring pastoral intercession..."
                  value={formData.prayer_requests}
                  onChange={e => setFormData({ ...formData, prayer_requests: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-3 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Challenges Faced
                </label>
                <textarea
                  rows={3}
                  placeholder="Venue limitations, logistics, transit challenges, equipment needs..."
                  value={formData.challenges_faced}
                  onChange={e => setFormData({ ...formData, challenges_faced: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-3 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Remarks / Recommendations
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes for regional leader or national coordinator review..."
                  value={formData.additional_remarks}
                  onChange={e => setFormData({ ...formData, additional_remarks: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-3 focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>
            </div>

            {/* Submission Summary Pill */}
            <div className="bg-navy-50/80 p-4 rounded-xl border border-navy-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-navy-800" />
                <div>
                  <span className="font-semibold text-navy-950">Verification Ready:</span>
                  <span className="text-slate-600 ml-1">
                    {totalAttendance} Attendance | {formData.souls_won} Souls Won |{' '}
                    {formData.follow_ups_conducted} Follow-ups
                  </span>
                </div>
              </div>
              <div className="text-slate-500 text-[11px]">
                Report will be logged under audit trail with your identity.
              </div>
            </div>
          </div>
        )}

        {/* Form Action Footer */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <Button type="button" variant="outline" size="sm" onClick={handlePrev}>
                Previous Step
              </Button>
            )}
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleSubmit(true)}
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Draft
            </Button>

            {activeStep < 4 ? (
              <Button type="button" variant="primary" size="sm" onClick={handleNext}>
                Continue to Step {activeStep + 1}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="gold"
                size="sm"
                isLoading={isSubmitting}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Submit Formal Report
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
