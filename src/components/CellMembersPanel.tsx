import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, Pencil, Trash2, X, Save, Users, Phone, AlertCircle } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';

type CellMember = {
  id: string;
  cell_id: string;
  full_name: string;
  phone_number?: string | null;
  status: 'Active' | 'Inactive' | 'Needs Follow-up';
  notes?: string | null;
  created_at: string;
};

type Draft = { full_name: string; phone_number: string; status: CellMember['status']; notes: string };

interface CellMembersPanelProps {
  cellId: string;
  createdBy?: string;
  canEdit?: boolean;
  compact?: boolean;
}

const emptyDraft: Draft = { full_name: '', phone_number: '', status: 'Active', notes: '' };

export const CellMembersPanel: React.FC<CellMembersPanelProps> = ({ cellId, createdBy, canEdit = false, compact = false }) => {
  const [members, setMembers] = useState<CellMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await SupabaseService.getCellMembers(cellId);
      if (result === null) throw new Error('The member directory could not be reached. Check your connection and try again.');
      setMembers(result as CellMember[]);
    } catch (err: any) {
      setError(err?.message || 'Unable to load cell members.');
    } finally {
      setLoading(false);
    }
  }, [cellId]);

  useEffect(() => { if (cellId) void load(); }, [cellId, load]);

  useEffect(() => {
    const handleCloudChange = (event: Event) => {
      const table = (event as CustomEvent).detail?.table;
      if (table === '*' || table === 'cell_members') void load();
    };
    window.addEventListener('fni:cloud-data-changed', handleCloudChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleCloudChange);
  }, [load]);

  const filtered = useMemo(() => members.filter(member =>
    member.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (member.phone_number || '').includes(search)
  ), [members, search]);

  const activeCount = members.filter(member => member.status === 'Active').length;

  const startEdit = (member: CellMember) => {
    setEditingId(member.id);
    setDraft({ full_name: member.full_name, phone_number: member.phone_number || '', status: member.status, notes: member.notes || '' });
    setShowForm(true);
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.full_name.trim() || draft.full_name.trim().length < 2) {
      setError('Enter the member’s full name (at least 2 characters).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await SupabaseService.saveCellMember({
        ...(editingId ? { id: editingId } : {}),
        cell_id: cellId,
        full_name: draft.full_name,
        phone_number: draft.phone_number,
        status: draft.status,
        notes: draft.notes,
        created_by: createdBy,
      });
      setShowForm(false);
      setEditingId(null);
      setDraft(emptyDraft);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not save this member.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: CellMember) => {
    if (!window.confirm('Remove ' + member.full_name + ' from this cell directory?')) return;
    try {
      await SupabaseService.deleteCellMember(member.id, cellId);
      setMembers(previous => previous.filter(item => item.id !== member.id));
    } catch (err: any) {
      setError(err?.message || 'Could not remove this member.');
    }
  };

  if (!cellId) return null;

  return (
    <section className="fni-cell-members-panel rounded-2xl border border-[#E3E8EF] bg-white shadow-sm overflow-hidden dark:border-[#314458] dark:bg-[#172433]">
      <div className="p-4 sm:p-5 border-b border-[#E3E8EF] dark:border-[#314458] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#EEF3FC] text-[#173B8F] flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h3 className="font-bold text-[#142B4A] dark:text-[#F1F5F9] text-sm">Cell Member Directory</h3>
            <p className="text-[11px] text-[#667085] dark:text-[#B5C2D0]">People in this cell do not need app accounts.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] text-[#475467] font-semibold">{members.length} total</span>
          <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">{activeCount} active</span>
          {canEdit && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); setShowForm(true); setError(''); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#173B8F] text-white font-bold hover:bg-[#12306F]"><UserPlus className="w-4 h-4" /> Add member</button>}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        {showForm && canEdit && (
          <form onSubmit={save} className="p-4 rounded-xl border border-[#D6E1F2] bg-[#F8FAFD] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-[#142B4A]">{editingId ? 'Update member' : 'Add a cell member'}</h4>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setDraft(emptyDraft); }} className="p-1.5 rounded-lg text-[#667085] hover:bg-white" aria-label="Close member form"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold text-[#475467]">Full name *
                <input required minLength={2} maxLength={120} value={draft.full_name} onChange={e => setDraft({ ...draft, full_name: e.target.value })} placeholder="Member’s full name" className="mt-1 w-full rounded-lg border border-[#D6DDE8] bg-white p-2.5 text-sm text-[#182230]" />
              </label>
              <label className="text-[11px] font-semibold text-[#475467]">Phone number (optional)
                <input value={draft.phone_number} onChange={e => setDraft({ ...draft, phone_number: e.target.value })} placeholder="e.g. 024 000 0000" className="mt-1 w-full rounded-lg border border-[#D6DDE8] bg-white p-2.5 text-sm text-[#182230]" />
              </label>
              <label className="text-[11px] font-semibold text-[#475467]">Membership status
                <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Draft['status'] })} className="mt-1 w-full rounded-lg border border-[#D6DDE8] bg-white p-2.5 text-sm text-[#182230]">
                  <option>Active</option><option>Inactive</option><option>Needs Follow-up</option>
                </select>
              </label>
              <label className="text-[11px] font-semibold text-[#475467]">Pastoral notes (optional)
                <input value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} maxLength={500} placeholder="Short internal note" className="mt-1 w-full rounded-lg border border-[#D6DDE8] bg-white p-2.5 text-sm text-[#182230]" />
              </label>
            </div>
            <div className="flex justify-end">
              <button disabled={saving} type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#173B8F] text-white text-xs font-bold disabled:opacity-60"><Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save member'}</button>
            </div>
          </form>
        )}

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#98A2B3]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members by name or phone…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E3E8EF] bg-white text-xs text-[#182230]" />
        </div>

        {loading ? <div className="py-8 text-center text-xs text-[#667085] dark:text-[#B5C2D0]">Loading member directory…</div> :
          filtered.length === 0 ? <div className="py-8 text-center">
            <Users className="w-7 h-7 mx-auto mb-2 text-[#98A2B3]" />
            <p className="text-xs font-semibold text-[#475467]">{search ? 'No members match your search.' : 'No members have been added to this cell yet.'}</p>
            {canEdit && !search && <p className="text-[11px] text-[#667085] mt-1">Add your first member to start building the official cell roll.</p>}
          </div> :
          <div className="divide-y divide-[#E9EDF4]">
            {filtered.map(member => (
              <div key={member.id} className="py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#EEF3FC] text-[#173B8F] font-bold text-xs flex items-center justify-center shrink-0">{member.full_name.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#182230] dark:text-[#F1F5F9] truncate">{member.full_name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {member.phone_number && <span className="inline-flex items-center gap-1 text-[11px] text-[#667085]"><Phone className="w-3 h-3" />{member.phone_number}</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${member.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : member.status === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{member.status}</span>
                  </div>
                  {member.notes && <p className="text-[11px] text-[#667085] dark:text-[#B5C2D0] mt-1 break-words">{member.notes}</p>}
                </div>
                {canEdit && <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => startEdit(member)} className="p-2 rounded-lg text-[#667085] hover:bg-[#F5F7FA]" aria-label={'Edit ' + member.full_name}><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => void remove(member)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label={'Remove ' + member.full_name}><Trash2 className="w-4 h-4" /></button>
                </div>}
              </div>
            ))}
          </div>
        }
      </div>
    </section>
  );
};
