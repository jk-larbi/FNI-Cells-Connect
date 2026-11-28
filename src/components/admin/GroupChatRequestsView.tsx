import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, MessageSquarePlus, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { MessagingService, GroupChatCreationRequest } from '../../services/messagingService';

export const GroupChatRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<GroupChatCreationRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await MessagingService.getGroupChatCreationRequests());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load group requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const review = async (request: GroupChatCreationRequest, decision: 'approved' | 'declined') => {
    if (reviewingId) return;
    const verb = decision === 'approved' ? 'approve' : 'decline';
    if (!window.confirm(`Are you sure you want to ${verb} "${request.group_name}"?`)) return;
    setReviewingId(request.id);
    setError(null);
    setNotice(null);
    try {
      await MessagingService.reviewGroupChatCreationRequest(request.id, decision, notes[request.id] || '');
      setNotice(decision === 'approved'
        ? `"${request.group_name}" has been approved and is now available in FNI Messages.`
        : `The request for "${request.group_name}" has been declined.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The request could not be reviewed.');
    } finally {
      setReviewingId(null);
    }
  };

  const pendingCount = requests.filter(request => request.status === 'pending').length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#9A7738]">FNI MESSAGES · MODERATION</p>
          <h3 className="text-lg font-extrabold text-navy-950">Group creation approvals</h3>
          <p className="text-xs text-slate-500 mt-1">Review member requests before new group conversations are activated.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-50 text-amber-800 px-3 py-1.5 text-xs font-bold">{pendingCount} pending</span>
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-9 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-xs">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-xs">{notice}</div>}

      {loading && requests.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading group requests…</div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
          <MessageSquarePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-sm text-slate-700">No group creation requests</p>
          <p className="text-xs text-slate-400 mt-1">New member requests will appear here for review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(request => {
            const pending = request.status === 'pending';
            return (
              <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-navy-950">{request.group_name}</h4>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${pending ? 'bg-amber-50 text-amber-800' : request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{request.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Requested by <span className="font-semibold text-slate-700">{request.requester_name || 'FNI Member'}</span> · {new Date(request.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Accra' })} GMT</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="w-3.5 h-3.5" /> {request.requested_member_ids?.length || 0} invitees</div>
                </div>
                {request.description && <p className="text-sm text-slate-600 whitespace-pre-wrap">{request.description}</p>}
                {request.review_note && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><strong>Review note:</strong> {request.review_note}</p>}
                {pending && (
                  <>
                    <label className="block text-xs font-semibold text-slate-600" htmlFor={`group-request-note-${request.id}`}>Review note (optional)</label>
                    <textarea id={`group-request-note-${request.id}`} rows={2} maxLength={300} value={notes[request.id] || ''} onChange={event => setNotes(previous => ({ ...previous, [request.id]: event.target.value }))} placeholder="Add a note for the requester…" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#C6A45A]" />
                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                      <button type="button" onClick={() => void review(request, 'declined')} disabled={reviewingId !== null} className="min-h-10 px-4 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                        <XCircle className="w-4 h-4" /> Decline
                      </button>
                      <button type="button" onClick={() => void review(request, 'approved')} disabled={reviewingId !== null} className="min-h-10 px-4 rounded-xl bg-navy-900 text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                        {reviewingId === request.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve group
                      </button>
                    </div>
                  </>
                )}
                {!pending && <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="w-4 h-4" /> Reviewed {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString('en-GB', { timeZone: 'Africa/Accra' }) + ' GMT' : ''}</div>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
