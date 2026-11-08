import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ReportService } from '../../services/reportService';
import { FollowUpService } from '../../services/followUpService';
import { CellMeetingReport, EvangelismReport, EvangelismContact, UnifiedReportItem } from '../../types';
import {
  History,
  FileText,
  Flame,
  UserCheck,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Building,
  ArrowLeft,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'meeting' | 'evangelism' | 'followup';
  title: string;
  subtitle: string;
  date: string;
  status?: string;
  isAlert?: boolean;
}

interface CellActivityHistoryViewProps {
  onBack?: () => void;
}

export const CellActivityHistoryView: React.FC<CellActivityHistoryViewProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const cellId = currentUser.cell_id;
        const [meetings, evangs, contacts] = await Promise.all([
          ReportService.getCellMeetingReports({ cellId: cellId || undefined }),
          ReportService.getEvangelismReports({ cellId: cellId || undefined }),
          FollowUpService.getContacts(cellId || undefined),
        ]);

        const timeline: TimelineEvent[] = [];

        meetings.forEach(m => {
          timeline.push({
            id: `m-${m.id}`,
            type: 'meeting',
            title: `Cell Meeting Return: ${m.attendance} Attended`,
            subtitle: `${m.members} registered members &bull; Status: ${m.status}`,
            date: m.meetingDate || m.submittedAt,
            status: m.status,
            isAlert: m.status === 'Needs Correction',
          });
        });

        evangs.forEach(e => {
          timeline.push({
            id: `e-${e.id}`,
            type: 'evangelism',
            title: `Evangelism Outreach: +${e.conversions} Souls Won`,
            subtitle: `${e.peopleSpokenTo} reached at ${e.location}`,
            date: e.date || e.submittedAt,
            status: e.status,
            isAlert: false,
          });
        });

        contacts.forEach(c => {
          const contactName = c.name || c.contactName || 'Outreach Contact';
          timeline.push({
            id: `c-${c.id}`,
            type: 'followup',
            title: `Follow-Up Contact: ${contactName}`,
            subtitle: `Status: ${c.followUpStatus} &bull; Location: ${c.location || 'Fellowship'}`,
            date: c.dateCaptured || c.createdAt,
            status: c.followUpStatus,
            isAlert: c.followUpStatus === 'Unreachable',
          });
        });

        // Sort descending by date
        timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvents(timeline);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [currentUser]);

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
          Cell Activity History & Timeline
        </h1>
        <p className="text-xs text-[#667085] mt-0.5">
          Chronological record of meetings, outreaches, submissions, and discipleship milestones for {currentUser.cell_name || 'your cell'}.
        </p>
      </div>

      {/* Timeline Card */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm p-6">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#667085]">Loading activity timeline...</div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#667085]">
            <History className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
            <p className="font-semibold text-[#182230]">No activity recorded yet.</p>
            <p className="mt-0.5">As you file meeting reports, evangelism outreaches, and contacts, your chronological activity timeline will appear here.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E3E8EF]">
            {events.map((ev, idx) => {
              return (
                <div key={ev.id} className="relative group">
                  {/* Node icon */}
                  <div
                    className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-2xs flex items-center justify-center ${
                      ev.type === 'meeting'
                        ? 'bg-[#142B4A]'
                        : ev.type === 'evangelism'
                        ? 'bg-[#23845B]'
                        : 'bg-[#C6A45A]'
                    }`}
                  />

                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      ev.isAlert
                        ? 'bg-[#FFF5F5] border-[#C74646] border-l-4'
                        : 'bg-[#F5F7FA] border-[#E3E8EF] hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {ev.type === 'meeting' && <FileText className="w-4 h-4 text-[#142B4A]" />}
                        {ev.type === 'evangelism' && <Flame className="w-4 h-4 text-[#23845B]" />}
                        {ev.type === 'followup' && <UserCheck className="w-4 h-4 text-[#C6A45A]" />}
                        <span className="font-bold text-xs text-[#182230]">{ev.title}</span>
                      </div>

                      <span className="text-[11px] text-[#667085] flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3" />
                        {new Date(ev.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs text-[#667085] mt-1">
                      <span dangerouslySetInnerHTML={{ __html: ev.subtitle }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
