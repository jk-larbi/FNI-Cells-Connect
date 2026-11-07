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
    const id = `cnt-${Date.now()}`;

    const newContact: EvangelismContact = {
      ...data,
      id,
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
    updates: Partial<EvangelismContact>
  ): Promise<EvangelismContact> {
    const nowIso = new Date().toISOString();
    const all = getStoredContacts();
    const index = all.findIndex(c => c.id === contactId);

    const merged: EvangelismContact = {
      ...(index >= 0 ? all[index] : (updates as EvangelismContact)),
      ...updates,
      id: contactId,
      updatedAt: nowIso,
    };

    if (isFirebaseConfigured && db) {
      try {
        const updatePayload = {
          ...updates,
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

  static async getSummary(cellId?: string): Promise<{
    totalContacts: number;
    requiringFollowUp: number;
    completed: number;
    outstanding: number;
  }> {
    const contacts = await this.getContacts(cellId);
    const totalContacts = contacts.length;

    const completed = contacts.filter(
      c => c.followUpStatus === 'Joined Ministry' || c.followUpStatus === 'Completed'
    ).length;

    const outstanding = contacts.filter(
      c => c.followUpStatus === 'New Contact' || c.followUpStatus === 'Follow-up Pending'
    ).length;

    const requiringFollowUp = contacts.filter(
      c =>
        c.followUpStatus === 'New Contact' ||
        c.followUpStatus === 'Follow-up Pending' ||
        c.followUpStatus === 'Contacted' ||
        c.followUpStatus === 'Interested'
    ).length;

    return {
      totalContacts,
      requiringFollowUp,
      completed,
      outstanding,
    };
  }
}
