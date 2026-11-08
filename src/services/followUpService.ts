import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
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
  static async getContacts(cellId?: string): Promise<EvangelismContact[]> {
    if (isFirebaseConfigured && db) {
      try {
        const contactsRef = collection(db, 'evangelismContacts');
        let q = query(contactsRef, orderBy('createdAt', 'desc'));
        if (cellId) {
          q = query(contactsRef, where('cellId', '==', cellId));
        }
        let snap = await getDocs(q);
        if (snap.empty) {
          // Check followUps collection
          const followUpsRef = collection(db, 'followUps');
          let fq = query(followUpsRef, orderBy('createdAt', 'desc'));
          if (cellId) {
            fq = query(followUpsRef, where('cellId', '==', cellId));
          }
          snap = await getDocs(fq);
        }
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as EvangelismContact));
          saveStoredContacts(list);
          return list;
        }
      } catch (e) {
        console.warn('Firebase getContacts error, falling back to local storage', e);
      }
    }

    let all = getStoredContacts();
    if (cellId) {
      all = all.filter(c => c.cellId === cellId);
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async addContact(
    data: Omit<EvangelismContact, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<EvangelismContact> {
    const nowIso = new Date().toISOString();
    const id = `cnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newContact: EvangelismContact = {
      ...data,
      id,
      whatsappNumber: data.whatsappNumber || data.phone || '',
      history: [
        {
          status: data.followUpStatus || 'Not contacted',
          note: data.notes || data.followUpNotes || 'Contact initially captured',
          changedAt: nowIso,
          changedBy: data.tutorName || 'Tutor',
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isFirebaseConfigured && db) {
      try {
        const payload = {
          ...newContact,
          serverCreatedAt: serverTimestamp(),
        };
        await Promise.all([
          setDoc(doc(db, 'evangelismContacts', id), payload),
          setDoc(doc(db, 'followUps', id), payload),
        ]);
      } catch (e) {
        console.warn('Firebase addContact error', e);
      }
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

    if (isFirebaseConfigured && db) {
      try {
        const updatePayload = {
          ...updates,
          history,
          updatedAt: nowIso,
          serverUpdatedAt: serverTimestamp(),
        };
        await Promise.all([
          updateDoc(doc(db, 'evangelismContacts', contactId), updatePayload).catch(() => {}),
          updateDoc(doc(db, 'followUps', contactId), updatePayload).catch(() => {}),
        ]);
      } catch (e) {
        console.warn('Firebase updateContact error', e);
      }
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
