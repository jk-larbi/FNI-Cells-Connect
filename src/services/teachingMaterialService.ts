import { collection, doc, setDoc, getDocs, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { TeachingMaterial } from '../types';

const STORAGE_KEY = 'fni_teaching_materials_v1';

const INITIAL_MATERIALS: TeachingMaterial[] = [
  {
    id: 'mat-001',
    title: 'Apostolic Cell Leadership & Pastoral Oversight',
    description: 'Foundational training manual for newly consecrated cell tutors. Explores spiritual authority, home visitation strategies, and soul nurturing protocols.',
    weekLabel: 'Week 45 (Foundations)',
    documentUrl: 'https://forerunnersnetwork.org/materials/pastoral-oversight-w45.pdf',
    fileName: 'FNI_Cell_Leadership_Manual_W45.pdf',
    fileSize: '1.4 MB',
    fileType: 'application/pdf',
    textContent: 'Session 1: The Heart of a Cell Shepherd\nJesus ministered in the synagogues and from house to house (Acts 20:20). The cell fellowship is the front-line battalion of the Kingdom of God.\n\nKey Tenets:\n1. Personal consecration and intercession for every assigned soul.\n2. Diligent record keeping and timely reporting by Sunday 6:00 PM.\n3. Continuous discipleship and follow-up until Christ is formed in every believer.',
    status: 'published',
    publishedAt: '2026-11-01T08:00:00Z',
    uploadedBy: 'usr-admin-master',
    uploadedByName: 'General Overseer / System Admin',
    createdAt: '2026-11-01T07:30:00Z',
    updatedAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 'mat-002',
    title: 'The Great Commission: Effective Field Evangelism Dynamics',
    description: 'Practical guide for cell evangelism outings. Covers pre-set goal setting, handling objections, gospel clarity, and seamless contact registration.',
    weekLabel: 'Week 46 (Harvest Outreaches)',
    documentUrl: 'https://forerunnersnetwork.org/materials/evangelism-dynamics-w46.pdf',
    fileName: 'FNI_Field_Evangelism_Dynamics_W46.pdf',
    fileSize: '950 KB',
    fileType: 'application/pdf',
    textContent: 'Session 2: Mobilizing the Harvest Team\nBefore setting out on an evangelism drive, the cell leader must declare a pre-set soul target and anoint the team in prayer.\n\nImmediate Steps:\n1. Gather names, phone numbers, and WhatsApp coordinates accurately.\n2. Verify decisions for Christ without inflating numbers.\n3. Follow up every contact within 48 hours.',
    status: 'published',
    publishedAt: '2026-11-04T10:00:00Z',
    uploadedBy: 'usr-admin-master',
    uploadedByName: 'System Administrator',
    createdAt: '2026-11-04T09:30:00Z',
    updatedAt: '2026-11-04T10:00:00Z',
  },
];

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
