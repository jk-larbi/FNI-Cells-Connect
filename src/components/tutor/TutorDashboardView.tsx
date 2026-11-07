import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CellService } from '../../services/cellService';
import { ReportService } from '../../services/reportService';
import { FollowUpService } from '../../services/followUpService';
import { getCurrentDeadlineInfo } from '../../utils/deadlineUtil';
import { Cell, CellMeetingReport, EvangelismReport, EvangelismContact } from '../../types';
import {
  Users,
  Building,
  Flame,
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Plus,
  ArrowRight,
  UserPlus,
  AlertTriangle,
  FileText,
  MapPin,
  Compass,
} from 'lucide-react';

interface TutorDashboardViewProps {
  onNavigateToTab: (tab: any) => void;
}

export const TutorDashboardView: React.FC<TutorDashboardViewProps> = ({ onNavigateToTab }) => {
  const { currentUser } = useAuth();
  const [cell, setCell] = useState<Cell | null>(null);
  const [meetingReports, setMeetingReports] = useState<CellMeetingReport[]>([]);
  const [evangReports, setEvangReports] = useState<EvangelismReport[]>([]);
  const [contacts, setContacts] = useState<EvangelismContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const deadlineInfo = getCurrentDeadlineInfo();

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const cellId = currentUser.cell_id;
        const [c, mList, eList, cntList] = await Promise.all([
          cellId ? CellService.getCellById(cellId) : Promise.resolve(null),
          ReportService.getCellMeetingReports({ cellId: cellId || undefined }),
          ReportService.getEvangelismReports({ cellId: cellId || undefined }),
          FollowUpService.getContacts(cellId || undefined),
        ]);
        setCell(c);
        setMeetingReports(mList);
        setEvangReports(eList);
        setContacts(cntList);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-[#667085] font-medium">
        Loading your cell intelligence...
      </div>
    );
  }

  // Calculate metrics for this tutor's cell
  const latestMeeting = meetingReports[0] || null;
  const totalMembers = latestMeeting ? latestMeeting.members : (cell?.target_attendance || 0);
  const activeMembers = latestMeeting ? latestMeeting.activeMembers : 0;
  const latestAttendance = latestMeeting ? latestMeeting.attendance : 0;
  const newMembersCount = latestMeeting ? latestMeeting.newMembers : 0;

  const totalEvangelismActivities = evangReports.length;
  const peopleReached = evangReports.reduce((s, e) => s + (Number(e.peopleSpokenTo) || 0), 0);
  const conversions = evangReports.reduce((s, e) => s + (Number(e.conversions) || 0), 0);

  const completedFollowUps = contacts.filter(
    c => c.followUpStatus === 'Joined Ministry' || c.followUpStatus === 'Completed'
  ).length;
  const requiringFollowUp = contacts.filter(
    c =>
      c.followUpStatus === 'New Contact' ||
      c.followUpStatus === 'Follow-up Pending' ||
      c.followUpStatus === 'Contacted' ||
      c.followUpStatus === 'Interested'
  ).length;

  const allTutorReports = [...meetingReports, ...evangReports];
  const awaitingReview = allTutorReports.filter(
    r => r.status === 'Newly Submitted' || r.status === 'submitted' || r.status === 'under_review'
  ).length;
  const approvedCount = allTutorReports.filter(r => r.status === 'Approved' || r.status === 'approved').length;
  const needsCorrectionCount = allTutorReports.filter(
    r => r.status === 'Needs Correction' || r.status === 'needs_revision'
  ).length;

  const hasSubmittedCurrentCycle = meetingReports.length > 0;
  const isLateSubmission = latestMeeting ? latestMeeting.late : false;

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
              My Cell Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#142B4A] text-[#C6A45A] text-[10px] font-bold uppercase tracking-wider">
              Tutor
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            Welcome back, <span className="font-bold text-[#182230]">{currentUser.full_name}</span> &bull; Fellowship: <span className="font-bold text-[#182230]">{cell?.name || currentUser.cell_name}</span> ({cell?.location || 'Central Campus'})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('submit-cell-meeting-report')}
            className="px-3.5 py-2 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] transition-colors shadow-sm flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Submit Meeting Return</span>
          </button>
          <button
            onClick={() => onNavigateToTab('submit-evangelism-report')}
            className="px-3.5 py-2 rounded-xl bg-[#23845B] text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Submit Evangelism</span>
          </button>
        </div>
      </div>

      {/* WEEKLY REPORTING DEADLINE BANNER (Prompt Section 8) */}
      <div className="bg-white rounded-2xl border-2 border-[#142B4A] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#142B4A] flex items-center justify-center text-[#C6A45A] shrink-0 mt-0.5 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                  Weekly Reporting Deadline
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#142B4A] text-white text-[10px] font-semibold">
                  {deadlineInfo.periodName}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-[#142B4A] mt-0.5">
                Every Sunday at 6:00 PM Ghana time (Africa/Accra)
              </h2>
              <p className="text-xs text-[#667085] mt-1">
                Next Deadline: <span className="font-bold text-[#182230]">{deadlineInfo.deadlineFormatted}</span>
              </p>
            </div>
          </div>

          {/* Submission Status Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF] text-xs">
              <div className="text-[10px] text-[#667085] font-semibold">Weekly Filing Status</div>
              <div className="font-bold mt-0.5 flex items-center gap-1.5">
                {hasSubmittedCurrentCycle ? (
                  isLateSubmission ? (
                    <span className="text-[#C74646] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Filed (Late)
                    </span>
                  ) : (
                    <span className="text-[#23845B] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Filed On-Time
                    </span>
                  )
                ) : (
                  <span className="text-[#D99A32] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Submission Pending
                  </span>
                )}
              </div>
            </div>

            {!hasSubmittedCurrentCycle && (
              <button
                onClick={() => onNavigateToTab('submit-cell-meeting-report')}
                className="px-4 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] shadow-sm flex items-center gap-1.5"
              >
                <span>File Return Now</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Review Status Warning if any needs correction */}
      {needsCorrectionCount > 0 && (
        <div className="p-4 bg-[#FFF5F5] rounded-2xl border-l-4 border-[#C74646] flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#C74646] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-[#C74646]">
                {needsCorrectionCount} Report Returned for Correction
              </h3>
              <p className="text-xs text-[#182230] mt-0.5">
                The administrator reviewed your submission and requested adjustments. Please inspect reviewer feedback comments and resubmit.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('my-reports')}
            className="px-3 py-1.5 rounded-xl bg-[#C74646] text-white text-xs font-bold hover:bg-rose-700 shrink-0"
          >
            Review & Edit
          </button>
        </div>
      )}

      {/* METRICS GRID FOR THIS CELL */}
      <div>
        <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-3">
          Cell Vital Statistics & Ministry Harvest
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
          {/* Total Members */}
          <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667085]">Total Members</div>
            <div className="text-xl font-black text-[#182230] mt-1">{totalMembers}</div>
            <div className="text-[10px] text-[#667085] mt-0.5">Registered Souls</div>
          </div>

          {/* Active Members */}
          <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667085]">Active Members</div>
            <div className="text-xl font-black text-[#23845B] mt-1">{activeMembers}</div>
            <div className="text-[10px] text-[#23845B] mt-0.5">Regular Attendees</div>
          </div>

          {/* Latest Attendance */}
          <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667085]">Latest Attendance</div>
            <div className="text-xl font-black text-[#142B4A] mt-1">{latestAttendance}</div>
            <div className="text-[10px] text-[#667085] mt-0.5">Last Fellowship</div>
          </div>

          {/* New Members */}
          <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667085]">New Members</div>
            <div className="text-xl font-black text-[#C6A45A] mt-1">+{newMembersCount}</div>
            <div className="text-[10px] text-[#C6A45A] mt-0.5">Added to Cell</div>
          </div>

          {/* Evangelism Activities */}
          <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667085]">Outreaches Held</div>
            <div className="text-xl font-black text-[#182230] mt-1">{totalEvangelismActivities}</div>
            <div className="text-[10px] text-[#667085] mt-0.5">Missions Filed</div>
          </div>

          {/* Conversions */}
          <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667085]">Souls Won</div>
            <div className="text-xl font-black text-[#23845B] mt-1">+{conversions}</div>
            <div className="text-[10px] text-[#23845B] mt-0.5">Conversions</div>
          </div>

          {/* People Reached */}
          <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667085]">People Spoken To</div>
            <div className="text-xl font-black text-[#182230] mt-1">{peopleReached}</div>
            <div className="text-[10px] text-[#667085] mt-0.5">Gospel Witness</div>
          </div>

          {/* Contacts Requiring Follow-Up */}
          <div
            onClick={() => onNavigateToTab('follow-ups')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#D99A32] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Follow-Up Required</div>
            <div className="text-xl font-black text-[#D99A32] mt-1">{requiringFollowUp}</div>
            <div className="text-[10px] text-[#D99A32] mt-0.5">Discipleship Pipeline</div>
          </div>

          {/* Completed Follow-ups */}
          <div
            onClick={() => onNavigateToTab('follow-ups')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#23845B] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Follow-ups Completed</div>
            <div className="text-xl font-black text-[#23845B] mt-1">{completedFollowUps}</div>
            <div className="text-[10px] text-[#23845B] mt-0.5">Retained / Joined</div>
          </div>

          {/* Reports Awaiting Review */}
          <div
            onClick={() => onNavigateToTab('my-reports')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#142B4A] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Awaiting Review</div>
            <div className="text-xl font-black text-[#182230] mt-1">{awaitingReview}</div>
            <div className="text-[10px] text-[#667085] mt-0.5">Central Review</div>
          </div>

          {/* Approved Reports */}
          <div
            onClick={() => onNavigateToTab('my-reports')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#23845B] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Approved Reports</div>
            <div className="text-xl font-black text-[#23845B] mt-1">{approvedCount}</div>
            <div className="text-[10px] text-[#23845B] mt-0.5">Verified Returns</div>
          </div>

          {/* Needs Correction */}
          <div
            onClick={() => onNavigateToTab('my-reports')}
            className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm hover:border-[#C74646] cursor-pointer transition-all"
          >
            <div className="text-[11px] font-semibold text-[#667085]">Needs Correction</div>
            <div className="text-xl font-black text-[#C74646] mt-1">{needsCorrectionCount}</div>
            <div className="text-[10px] text-[#C74646] mt-0.5">Requires Resubmit</div>
          </div>
        </div>
      </div>

      {/* Recent Submissions List for this Cell (Reference Image Styled!) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#182230]">
            My Recent Returns ({allTutorReports.length})
          </h2>
          <button
            onClick={() => onNavigateToTab('my-reports')}
            className="text-xs font-bold text-[#142B4A] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[#E3E8EF]">
          {allTutorReports.length === 0 ? (
            <div className="py-12 text-center text-[#667085] text-xs">
              No reports filed yet for this cell. Click "+ Submit Meeting Return" to start.
            </div>
          ) : (
            allTutorReports.slice(0, 5).map(report => {
              const isMeeting = 'attendance' in report;
              const isNeedsCorrection =
                report.status === 'Needs Correction' || report.status === 'needs_revision';
              const isApproved = report.status === 'Approved' || report.status === 'approved';

              return (
                <div
                  key={report.id}
                  onClick={() => onNavigateToTab('my-reports')}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                    isNeedsCorrection
                      ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]'
                      : 'hover:bg-[#F5F7FA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                      {isMeeting ? 'MR' : 'EV'}
                    </div>
                    <div>
                      <div className="font-bold text-[#182230] text-xs">
                        {isMeeting
                          ? `Meeting Return: ${(report as CellMeetingReport).meetingDate}`
                          : `Evangelism Outreach: ${(report as EvangelismReport).date}`}
                      </div>
                      <div className="text-[11px] text-[#667085] mt-0.5">
                        {isMeeting
                          ? `${(report as CellMeetingReport).attendance} Attended &bull; ${(report as CellMeetingReport).members} Members`
                          : `+${(report as EvangelismReport).conversions} Souls &bull; ${(report as EvangelismReport).location}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Status Dot */}
                    <div>
                      {isApproved && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-[#23845B]">
                          <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                          Approved
                        </span>
                      )}
                      {!isApproved && !isNeedsCorrection && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-[#D99A32]">
                          <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                          Awaiting Review
                        </span>
                      )}
                      {isNeedsCorrection && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-[#C74646]">
                          <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                          Needs Correction
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-[#667085] hidden sm:block">
                      {new Date(report.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
