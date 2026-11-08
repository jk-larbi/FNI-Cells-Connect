import { SupabaseService } from './supabaseService';
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

    // 1. Primary: Load from Supabase
    try {
      const supaContacts = await SupabaseService.getEvangelismContacts({ cellId: targetCellId, tutorUid: targetTutorUid });
      if (supaContacts && supaContacts.length > 0) {
        saveStoredContacts(supaContacts);
        return supaContacts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
    } catch (e) {
      console.warn('Notice querying Supabase contacts:', e);
    }

    // 2. Fallback to locally stored contacts
    let all: EvangelismContact[] = getStoredContacts();

    if (targetCellId || targetTutorUid) {
      all = all.filter(c => {
        const matchCell = targetCellId ? c.cellId === targetCellId : false;
        const matchTutor = targetTutorUid ? c.tutorUid === targetTutorUid : false;
        return matchCell || matchTutor;
      });
    }

    return all.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
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
