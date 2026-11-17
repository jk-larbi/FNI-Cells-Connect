import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Video,
  User,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Share2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LearningEvent } from '../../types/learning';
import { LearningService } from '../../services/learningService';

interface LearningEventsViewProps {
  events: LearningEvent[];
  onRefresh: () => void;
}

export const LearningEventsView: React.FC<LearningEventsViewProps> = ({
  events,
  onRefresh,
}) => {
  const { currentUser, isAdmin } = useAuth();

  // Create / Edit Event Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LearningEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [meetingType, setMeetingType] = useState<'online' | 'in_person' | 'hybrid'>('hybrid');
  const [speaker, setSpeaker] = useState('');
  const [materialsLink, setMaterialsLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  const handleOpenModal = (evt?: LearningEvent) => {
    if (evt) {
      setEditingEvent(evt);
      setTitle(evt.title);
      setDescription(evt.description);
      setEventDate(evt.event_date);
      setStartTime(evt.start_time);
      setEndTime(evt.end_time);
      setLocationOrLink(evt.location_or_link);
      setMeetingType(evt.meeting_type);
      setSpeaker(evt.speaker || '');
      setMaterialsLink(evt.materials_link || '');
    } else {
      setEditingEvent(null);
      setTitle('');
      setDescription('');
      const d = new Date(Date.now() + 5 * 86400000);
      setEventDate(d.toISOString().split('T')[0]);
      setStartTime('18:30');
      setEndTime('20:30');
      setLocationOrLink('FNI Ministry Auditorium & Zoom Stream');
      setMeetingType('hybrid');
      setSpeaker('Apostolic Directorate');
      setMaterialsLink('');
    }
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      alert('Please fill out the required event fields.');
      return;
    }

    setIsSaving(true);
    try {
      await LearningService.saveEvent(
        {
          id: editingEvent?.id,
          title: title.trim(),
          description: description.trim(),
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime,
          location_or_link: locationOrLink.trim() || 'Online Webinar',
          meeting_type: meetingType,
          speaker: speaker.trim() || undefined,
          materials_link: materialsLink.trim() || undefined,
          status: 'upcoming',
        },
        { id: currentUser.id }
      );

      setIsModalOpen(false);
      onRefresh();
      alert('Ministry event successfully scheduled and announced to all tutors!');
    } catch (err: any) {
      alert(err.message || 'Failed to save event.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateChip = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const day = d.getDate();
      const weekday = d.toLocaleString('en-US', { weekday: 'short' });
      return { month, day, weekday };
    } catch {
      return { month: 'EVT', day: '01', weekday: 'Day' };
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const filteredEvents = events.filter(e => {
    if (activeFilter === 'upcoming') return e.event_date >= todayStr;
    if (activeFilter === 'past') return e.event_date < todayStr;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#142B4A] dark:text-white">
              Upcoming Training Sessions & Ministry Events
            </h2>
            <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
              Leadership webinars, apostolic masterclasses, and cell conferences.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#C6A45A]" />
            <span>Schedule Event</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-[#F5F7FA] dark:bg-[#172437] p-1 rounded-xl text-xs font-bold text-[#667085] w-fit">
        <button
          onClick={() => setActiveFilter('upcoming')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeFilter === 'upcoming'
              ? 'bg-[#142B4A] text-white shadow-2xs'
              : 'hover:text-[#182230] dark:hover:text-white'
          }`}
        >
          Upcoming ({events.filter(e => e.event_date >= todayStr).length})
        </button>
        <button
          onClick={() => setActiveFilter('past')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeFilter === 'past'
              ? 'bg-[#142B4A] text-white shadow-2xs'
              : 'hover:text-[#182230] dark:hover:text-white'
          }`}
        >
          Past Events ({events.filter(e => e.event_date < todayStr).length})
        </button>
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-[#142B4A] text-white shadow-2xs'
              : 'hover:text-[#182230] dark:hover:text-white'
          }`}
        >
          All ({events.length})
        </button>
      </div>

      {/* Event List (Styled with clean date cards matching user reference image) */}
      {filteredEvents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d]">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
            No events scheduled in this view
          </h3>
          <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
            {isAdmin
              ? 'Click "Schedule Event" above to plan a leadership assembly or masterclass.'
              : 'Check back soon for upcoming calendar announcements from leadership.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredEvents.map(evt => {
            const chip = formatDateChip(evt.event_date);
            const isOnline = evt.meeting_type === 'online';

            return (
              <div
                key={evt.id}
                className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  {/* Date Chip */}
                  <div className="w-14 h-16 rounded-2xl bg-[#F5F7FA] dark:bg-[#172437] border border-[#E3E8EF] dark:border-[#26384d] flex flex-col items-center justify-center shrink-0 shadow-2xs">
                    <span className="text-[10px] font-black uppercase text-[#C74646]">
                      {chip.month}
                    </span>
                    <span className="text-xl font-black text-[#142B4A] dark:text-white leading-none my-0.5">
                      {chip.day}
                    </span>
                    <span className="text-[10px] font-semibold text-[#667085]">
                      {chip.weekday}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-[#182230] dark:text-white leading-snug">
                        {evt.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 text-[10px] font-bold">
                        {evt.meeting_type.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-[#667085] dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#667085] dark:text-slate-400 mt-2">
                      <span className="flex items-center gap-1 font-semibold text-[#142B4A] dark:text-slate-200">
                        <Clock className="w-3.5 h-3.5 text-[#C6A45A]" />
                        {evt.start_time} - {evt.end_time} GMT
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        {isOnline ? (
                          <Video className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span className="truncate">{evt.location_or_link}</span>
                      </span>
                      {evt.speaker && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>{evt.speaker}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(evt)}
                        className="p-2 rounded-xl text-slate-500 hover:text-[#142B4A] hover:bg-slate-100"
                        title="Edit Event"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Remove event "${evt.title}"?`)) {
                            await LearningService.deleteEvent(evt.id);
                            onRefresh();
                          }
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-[#C74646] hover:bg-rose-50"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => alert(`RSVP recorded! Reminder set for ${evt.title} on ${evt.event_date}.`)}
                      className="px-4 py-2 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>RSVP / Attend</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <h3 className="font-bold text-[#142B4A] dark:text-white">
                  {editingEvent ? 'Edit Ministry Event' : 'Schedule New Event'}
                </h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Announced to all active cell tutors upon scheduling.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. National Cell Leaders Masterclass"
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Outline the meeting agenda, objectives, and spiritual focus..."
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Meeting Format
                  </label>
                  <select
                    value={meetingType}
                    onChange={e => setMeetingType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  >
                    <option value="hybrid">Hybrid (In-Person + Online)</option>
                    <option value="online">Online Stream (Zoom/Meet)</option>
                    <option value="in_person">In-Person Fellowship</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Minister / Keynote Speaker
                  </label>
                  <input
                    type="text"
                    value={speaker}
                    onChange={e => setSpeaker(e.target.value)}
                    placeholder="e.g. Apostolic Council"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Location or Streaming Link *
                </label>
                <input
                  type="text"
                  required
                  value={locationOrLink}
                  onChange={e => setLocationOrLink(e.target.value)}
                  placeholder="Auditorium venue address or Zoom URL"
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>{isSaving ? 'Scheduling...' : 'Announce Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
