import { collection, doc, setDoc, getDocs, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { SupabaseService } from './supabaseService';
import { TeachingMaterial } from '../types';

const STORAGE_KEY = 'fni_teaching_materials_v2_clean';

const INITIAL_MATERIALS: TeachingMaterial[] = [];

function getStoredMaterials(): TeachingMaterial[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_MATERIALS;
  } catch {
    return INITIAL_MATERIALS;
  }
}

function setStoredMaterials(items: TeachingMaterial[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save materials locally', e);
  }
}

export class TeachingMaterialService {
  static async getMaterials(isAdmin = false): Promise<TeachingMaterial[]> {
    // 1. Primary: Try Supabase
    const supaMaterials = await SupabaseService.getTeachingMaterials();
    if (supaMaterials && supaMaterials.length > 0) {
      setStoredMaterials(supaMaterials);
      return isAdmin ? supaMaterials : supaMaterials.filter(m => m.status === 'published');
    }
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(
          query(collection(db, 'teachingMaterials'), orderBy('createdAt', 'desc'))
        );
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as TeachingMaterial));
          setStoredMaterials(list);
          return isAdmin ? list : list.filter(m => m.status === 'published');
        }
      } catch (e) {
        console.warn('Firebase getMaterials notice:', e);
      }
    }

    const all = getStoredMaterials();
    return isAdmin ? all : all.filter(m => m.status === 'published');
  }

  static async uploadMaterial(data: {
    title: string;
    description: string;
    weekLabel: string;
    fileName?: string;
    fileSize?: string;
    documentUrl?: string;
    textContent?: string;
    status: 'published' | 'archived';
    uploadedBy: string;
    uploadedByName: string;
  }): Promise<TeachingMaterial> {
    const id = `mat-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: TeachingMaterial = {
      id,
      title: data.title.trim(),
      description: data.description.trim(),
      weekLabel: data.weekLabel.trim(),
      documentUrl: data.documentUrl || '',
      fileName: data.fileName || `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      fileSize: data.fileSize || '1.2 MB',
      fileType: 'application/pdf',
      textContent: data.textContent?.trim(),
      status: data.status,
      publishedAt: data.status === 'published' ? nowIso : undefined,
      uploadedBy: data.uploadedBy,
      uploadedByName: data.uploadedByName,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Dual-write to Supabase
    try {
      await SupabaseService.upsertTeachingMaterial(record);
    } catch (err) {
      console.warn('Supabase teaching material notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'teachingMaterials', id), record);
      } catch (e) {
        console.warn('Firebase save material notice:', e);
      }
    }

    const all = getStoredMaterials();
    all.unshift(record);
    setStoredMaterials(all);

    // If published, notify all field tutors
    if (record.status === 'published') {
      try {
        const { NotificationService } = await import('./notificationService');
        await NotificationService.notifyTeachingNotes({
          materialId: record.id,
          title: record.title,
          weekLabel: record.weekLabel,
          uploadedByName: record.uploadedByName,
        });
      } catch (e) {
        console.warn('Teaching material notification notice:', e);
      }
    }

    return record;
  }

  static async updateMaterialStatus(
    materialId: string,
    newStatus: 'published' | 'archived'
  ): Promise<TeachingMaterial | null> {
    const all = getStoredMaterials();
    const item = all.find(m => m.id === materialId);
    if (!item) return null;

    item.status = newStatus;
    item.updatedAt = new Date().toISOString();
    if (newStatus === 'published' && !item.publishedAt) {
      item.publishedAt = item.updatedAt;
    }

    setStoredMaterials(all);

    if (newStatus === 'published') {
      try {
        const { NotificationService } = await import('./notificationService');
        await NotificationService.notifyTeachingNotes({
          materialId: item.id,
          title: item.title,
          weekLabel: item.weekLabel,
          uploadedByName: item.uploadedByName,
        });
      } catch (e) {
        console.warn('Teaching material notification notice:', e);
      }
    }

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'teachingMaterials', materialId), {
          status: newStatus,
          updatedAt: item.updatedAt,
          publishedAt: item.publishedAt,
        });
      } catch (e) {
        console.warn('Firebase update material notice:', e);
      }
    }

    return item;
  }
}
