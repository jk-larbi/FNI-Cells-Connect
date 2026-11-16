import { SupabaseService } from './supabaseService';
import { CellService } from './cellService';
import { EvangelismContact, FollowUpStatus } from '../types';

const STORAGE_KEY = 'fni_contacts_store_v5_clean';

function getStoredContacts(): EvangelismContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredContacts(contacts: EvangelismContact[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch (e) {
    console.warn('Failed saving contacts to localStorage', e);
  }
}

export class FollowUpService {
  static async getContacts(
    filter?: { cellId?: string; tutorUid?: string } | string
  ): Promise<EvangelismContact[]> {
    let targetCellId: string | undefined;
    let targetTutorUid: string | undefined;

    if (typeof filter === 'string') {
      targetCellId = filter;
    } else if (filter) {
      targetCellId = filter.cellId;
      targetTutorUid = filter.tutorUid;
    }

    const activeCells = await CellService.getActiveCells();
    const activeCellIds = new Set(activeCells.flatMap(cell => [cell.id, cell.firebase_id].filter((id): id is string => Boolean(id))));
    const requestedCell = activeCells.find(cell =>
      cell.id === targetCellId || cell.firebase_id === targetCellId || cell.tutorUid === targetTutorUid
    );
    const requestedCellIds = requestedCell
      ? new Set([requestedCell.id, requestedCell.firebase_id].filter((id): id is string => Boolean(id)))
      : targetCellId ? new Set([targetCellId]) : null;
    const applyFilters = (contacts: EvangelismContact[]) => contacts
      .filter(contact => activeCellIds.has(contact.cellId))
      .filter(contact => !requestedCellIds || requestedCellIds.has(contact.cellId))
      .filter(contact => !targetTutorUid || contact.tutorUid === targetTutorUid)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Supabase is authoritative even when it returns no contacts; do not resurrect deleted-cell cache.
    try {
      const supaContacts = await SupabaseService.getEvangelismContacts({ tutorUid: targetTutorUid });
      if (supaContacts !== null) {
        const visible = applyFilters(supaContacts);
        saveStoredContacts(visible);
        return visible;
      }
    } catch (e) {
      console.warn('Notice querying Supabase contacts:', e);
    }

    return applyFilters(getStoredContacts());
  }

  static async addContact(
    data: Omit<EvangelismContact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<EvangelismContact> {
    const nowIso = new Date().toISOString();
    const id = `cnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const effectiveName = data.name || data.contactName || 'New Contact';
    const effectivePhone = data.phone || data.contactDetails || '';
    const effectiveWA = data.whatsappNumber || effectivePhone;
    const effectiveLoc = data.location || data.evangelismLocation || 'Territory';
    const effectiveNotes = data.notes || data.followUpNotes || 'Contact initially captured';

    const newContact: EvangelismContact = {
      ...data,
      id,
      name: effectiveName,
      contactName: effectiveName,
      phone: effectivePhone,
      contactDetails: effectivePhone,
      whatsappNumber: effectiveWA,
      location: effectiveLoc,
      evangelismLocation: effectiveLoc,
      tutorName: data.tutorName || data.assignedToName || 'Tutor',
      assignedToName: data.assignedToName || data.tutorName || 'Tutor',
      notes: effectiveNotes,
      followUpNotes: effectiveNotes,
      history: [
        {
          status: data.followUpStatus || 'Not contacted',
          note: effectiveNotes,
          changedAt: nowIso,
          changedBy: data.tutorName || data.assignedToName || 'Tutor',
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Primary write to Supabase
    try {
      await SupabaseService.upsertEvangelismContact(newContact);
    } catch (err) {
      console.warn('Supabase addContact notice:', err);
    }

    const all = getStoredContacts();
    const updated = [newContact, ...all];
    saveStoredContacts(updated);

    return newContact;
  }

  static async updateContact(
    contactId: string,
    updates: Partial<EvangelismContact>,
    changedBy?: string
  ): Promise<EvangelismContact> {
    const nowIso = new Date().toISOString();
    const all = getStoredContacts();
    const index = all.findIndex(c => c.id === contactId);
    const existing = index >= 0 ? all[index] : null;

    let history = existing?.history || [];
    if (updates.followUpStatus && updates.followUpStatus !== existing?.followUpStatus) {
      history = [
        {
          status: updates.followUpStatus,
          note: updates.followUpNotes || updates.notes || `Status transitioned to ${updates.followUpStatus}`,
          changedAt: nowIso,
          changedBy: changedBy || existing?.tutorName || 'Tutor',
        },
        ...history,
      ];
    }

    const merged: EvangelismContact = {
      ...(existing || (updates as EvangelismContact)),
      ...updates,
      history,
      id: contactId,
      updatedAt: nowIso,
    };

    // Primary write to Supabase
    try {
      await SupabaseService.upsertEvangelismContact(merged);
    } catch (err) {
      console.warn('Supabase updateContact notice:', err);
    }

    if (index >= 0) {
      all[index] = merged;
      saveStoredContacts(all);
    } else {
      saveStoredContacts([merged, ...all]);
    }

    return merged;
  }

  static async findDuplicateContact(
    phone: string,
    whatsappNumber?: string
  ): Promise<EvangelismContact | null> {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const cleanWhatsApp = (whatsappNumber || '').replace(/[^0-9]/g, '');
    if (!cleanPhone && !cleanWhatsApp) return null;

    const all = await this.getContacts();
    return (
      all.find(c => {
        const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
        const cWa = (c.whatsappNumber || '').replace(/[^0-9]/g, '');
        if (cleanPhone && (cPhone === cleanPhone || cWa === cleanPhone)) return true;
        if (cleanWhatsApp && (cPhone === cleanWhatsApp || cWa === cleanWhatsApp)) return true;
        return false;
      }) || null
    );
  }

  static async getSummary(cellId?: string): Promise<{
    totalContacts: number;
    notContacted: number;
    followUpRequired: number;
    contacted: number;
    interested: number;
    joinedCell: number;
    completed: number;
    unreachable: number;
    requiringFollowUp: number;
    outstanding: number;
  }> {
    const contacts = await this.getContacts(cellId);
    const totalContacts = contacts.length;

    const notContacted = contacts.filter(
      c => c.followUpStatus === 'Not contacted' || c.followUpStatus === 'New Contact'
    ).length;

    const followUpRequired = contacts.filter(
      c => c.followUpStatus === 'Follow-up required' || c.followUpStatus === 'Follow-up Pending'
    ).length;

    const contacted = contacts.filter(c => c.followUpStatus === 'Contacted').length;
    const interested = contacts.filter(c => c.followUpStatus === 'Interested').length;
    const joinedCell = contacts.filter(
      c => c.followUpStatus === 'Joined a cell' || c.followUpStatus === 'Joined Ministry'
    ).length;
    const completed = contacts.filter(c => c.followUpStatus === 'Completed').length;
    const unreachable = contacts.filter(c => c.followUpStatus === 'Unreachable').length;

    const outstanding = notContacted + followUpRequired + contacted + interested;
    const requiringFollowUp = followUpRequired + notContacted;

    return {
      totalContacts,
      notContacted,
      followUpRequired,
      contacted,
      interested,
      joinedCell,
      completed,
      unreachable,
      requiringFollowUp,
      outstanding,
    };
  }
}
