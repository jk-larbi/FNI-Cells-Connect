import fs from 'fs';
import path from 'path';

const root = process.cwd();

// ==============================================================================
// 1. UPDATE reportService.ts
// ==============================================================================
function updateReportService() {
  const filePath = path.join(root, 'src', 'services', 'reportService.ts');
  let code = fs.readFileSync(filePath, 'utf8');

  // Add import
  if (!code.includes("import { SupabaseService } from './supabaseService';")) {
    code = code.replace(
      "import { CellService } from './cellService';",
      "import { CellService } from './cellService';\nimport { SupabaseService } from './supabaseService';"
    );
  }

  // Update getCellMeetingReports
  if (!code.includes('SupabaseService.getCellMeetingReports')) {
    const target = /static async getCellMeetingReports\(filters\?: \{[\s\S]*?\}\): Promise<CellMeetingReport\[\]> \{[\r\n\s]*if \(isFirebaseConfigured && db\) \{/;
    code = code.replace(target, `static async getCellMeetingReports(filters?: {
    cellId?: string;
    tutorUid?: string;
    status?: ReportStatus;
  }): Promise<CellMeetingReport[]> {
    // 1. Primary: Try Supabase
    const supaReports = await SupabaseService.getCellMeetingReports(filters);
    if (supaReports && supaReports.length > 0) {
      let filtered = supaReports;
      if (filters?.status) filtered = filtered.filter(r => r.status === filters.status);
      setStored(STORAGE_KEYS.MEETING_REPORTS, filtered);
      return filtered;
    }

    if (isFirebaseConfigured && db) {`);
  }

  // Update submitCellMeetingReport
  if (!code.includes('SupabaseService.upsertCellMeetingReport(report)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'cellMeetingReports\', reportId), {';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'cellMeetingReports\', reportId), {';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.upsertCellMeetingReport(report);
    } catch (err) {
      console.warn('Supabase meeting report sync notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'cellMeetingReports', reportId), {`;

    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  // Update getEvangelismReports
  if (!code.includes('SupabaseService.getEvangelismReports')) {
    const target = /static async getEvangelismReports\(filters\?: \{[\s\S]*?\}\): Promise<EvangelismReport\[\]> \{[\r\n\s]*if \(isFirebaseConfigured && db\) \{/;
    code = code.replace(target, `static async getEvangelismReports(filters?: {
    cellId?: string;
    tutorUid?: string;
    status?: ReportStatus;
  }): Promise<EvangelismReport[]> {
    // 1. Primary: Try Supabase
    const supaReports = await SupabaseService.getEvangelismReports(filters);
    if (supaReports && supaReports.length > 0) {
      let filtered = supaReports;
      if (filters?.status) filtered = filtered.filter(r => r.status === filters.status);
      setStored(STORAGE_KEYS.EVANGELISM_REPORTS, filtered);
      return filtered;
    }

    if (isFirebaseConfigured && db) {`);
  }

  // Update submitEvangelismReport
  if (!code.includes('SupabaseService.upsertEvangelismReport(report)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'evangelismReports\', reportId), {';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'evangelismReports\', reportId), {';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.upsertEvangelismReport(report);
    } catch (err) {
      console.warn('Supabase evangelism report sync notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'evangelismReports', reportId), {`;

    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  // Update reviewReport
  if (!code.includes('Supabase report review sync notice:')) {
    const target = 'const collectionName = reportType === \'meeting\' ? \'cellMeetingReports\' : \'evangelismReports\';';
    const replacement = `const collectionName = reportType === 'meeting' ? 'cellMeetingReports' : 'evangelismReports';

    // Dual-write to Supabase
    try {
      if (reportType === 'meeting') {
        const meetingList = getStored<CellMeetingReport[]>(STORAGE_KEYS.MEETING_REPORTS, []);
        const target = meetingList.find(r => r.id === reportId);
        if (target) {
          await SupabaseService.upsertCellMeetingReport({
            ...target,
            status,
            reviewerComment: comment,
            reviewedBy: reviewerUid,
            reviewedByName: reviewerName,
            reviewedAt: nowIso,
          });
        }
      } else {
        const evList = getStored<EvangelismReport[]>(STORAGE_KEYS.EVANGELISM_REPORTS, []);
        const target = evList.find(r => r.id === reportId);
        if (target) {
          await SupabaseService.upsertEvangelismReport({
            ...target,
            status,
            reviewerComment: comment,
            reviewedBy: reviewerUid,
            reviewedByName: reviewerName,
            reviewedAt: nowIso,
          });
        }
      }
    } catch (err) {
      console.warn('Supabase report review sync notice:', err);
    }`;
    code = code.replace(target, replacement);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Updated reportService.ts with Supabase adapter');
}

// ==============================================================================
// 2. UPDATE followUpService.ts
// ==============================================================================
function updateFollowUpService() {
  const filePath = path.join(root, 'src', 'services', 'followUpService.ts');
  let code = fs.readFileSync(filePath, 'utf8');

  if (!code.includes("import { SupabaseService } from './supabaseService';")) {
    code = code.replace(
      "import { db, isFirebaseConfigured } from './firebase';",
      "import { db, isFirebaseConfigured } from './firebase';\nimport { SupabaseService } from './supabaseService';"
    );
  }

  // Update getContacts
  if (!code.includes('SupabaseService.getEvangelismContacts')) {
    const target = 'let all: EvangelismContact[] = [];';
    const replacement = `// 1. Primary: Try Supabase
    const supaContacts = await SupabaseService.getEvangelismContacts({ cellId: targetCellId, tutorUid: targetTutorUid });
    if (supaContacts && supaContacts.length > 0) {
      saveStoredContacts(supaContacts);
      return supaContacts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    let all: EvangelismContact[] = [];`;
    code = code.replace(target, replacement);
  }

  // Update addContact
  if (!code.includes('SupabaseService.upsertEvangelismContact(record)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'evangelismContacts\', id), {';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'evangelismContacts\', id), {';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.upsertEvangelismContact(record);
    } catch (err) {
      console.warn('Supabase contact sync notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'evangelismContacts', id), {`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  // Update updateContact
  if (!code.includes('SupabaseService.upsertEvangelismContact(updated)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'evangelismContacts\', contactId), updated, { merge: true });';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'evangelismContacts\', contactId), updated, { merge: true });';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.upsertEvangelismContact(updated);
    } catch (err) {
      console.warn('Supabase contact update notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'evangelismContacts', contactId), updated, { merge: true });`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  // Update deleteContact
  if (!code.includes('SupabaseService.deleteEvangelismContact(contactId)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await deleteDoc(doc(db, \'evangelismContacts\', contactId));';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await deleteDoc(doc(db, \'evangelismContacts\', contactId));';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.deleteEvangelismContact(contactId);
    } catch (err) {
      console.warn('Supabase contact delete notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'evangelismContacts', contactId));`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Updated followUpService.ts with Supabase adapter');
}

// ==============================================================================
// 3. UPDATE financeService.ts
// ==============================================================================
function updateFinanceService() {
  const filePath = path.join(root, 'src', 'services', 'financeService.ts');
  let code = fs.readFileSync(filePath, 'utf8');

  if (!code.includes("import { SupabaseService } from './supabaseService';")) {
    code = code.replace(
      "import { db, isFirebaseConfigured } from './firebase';",
      "import { db, isFirebaseConfigured } from './firebase';\nimport { SupabaseService } from './supabaseService';"
    );
  }

  // Update recordOfferingFromReport
  if (!code.includes('SupabaseService.upsertOfferingRecord(record)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'offerings\', id), record, { merge: true });';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'offerings\', id), record, { merge: true });';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.upsertOfferingRecord(record);
    } catch (err) {
      console.warn('Supabase offering sync notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'offerings', id), record, { merge: true });`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  // Update getAllOfferings
  if (!code.includes('SupabaseService.getOfferingRecords()')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        const snap = await getDocs(query(collection(db, \'offerings\'), orderBy(\'meetingDate\', \'desc\')));';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        const snap = await getDocs(query(collection(db, \'offerings\'), orderBy(\'meetingDate\', \'desc\')));';
    const replacement = `// 1. Primary: Try Supabase
    const supaOfferings = await SupabaseService.getOfferingRecords();
    if (supaOfferings && supaOfferings.length > 0) {
      setStoredOfferings(supaOfferings);
      return supaOfferings;
    }

    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(query(collection(db, 'offerings'), orderBy('meetingDate', 'desc')));`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Updated financeService.ts with Supabase adapter');
}

// ==============================================================================
// 4. UPDATE settingsService.ts
// ==============================================================================
function updateSettingsService() {
  const filePath = path.join(root, 'src', 'services', 'settingsService.ts');
  let code = fs.readFileSync(filePath, 'utf8');

  if (!code.includes("import { SupabaseService } from './supabaseService';")) {
    code = code.replace(
      "import { db, isFirebaseConfigured } from './firebase';",
      "import { db, isFirebaseConfigured } from './firebase';\nimport { SupabaseService } from './supabaseService';"
    );
  }

  // Update getSettings
  if (!code.includes('SupabaseService.getSystemSettings()')) {
    const target = 'static async getSettings(): Promise<SystemSettings> {';
    const replacement = `static async getSettings(): Promise<SystemSettings> {
    // 1. Primary: Try Supabase
    const supaSettings = await SupabaseService.getSystemSettings();
    if (supaSettings) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supaSettings));
      return supaSettings;
    }`;
    code = code.replace(target, replacement);
  }

  // Update updateSettings
  if (!code.includes('SupabaseService.upsertSystemSettings(updated)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'systemSettings\', \'general\'), {';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'systemSettings\', \'general\'), {';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.upsertSystemSettings(updated);
    } catch (err) {
      console.warn('Supabase settings sync notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'systemSettings', 'general'), {`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Updated settingsService.ts with Supabase adapter');
}

// ==============================================================================
// 5. UPDATE soulTargetService.ts
// ==============================================================================
function updateSoulTargetService() {
  const filePath = path.join(root, 'src', 'services', 'soulTargetService.ts');
  let code = fs.readFileSync(filePath, 'utf8');

  if (!code.includes("import { SupabaseService } from './supabaseService';")) {
    code = code.replace(
      "import { db, isFirebaseConfigured } from './firebase';",
      "import { db, isFirebaseConfigured } from './firebase';\nimport { SupabaseService } from './supabaseService';"
    );
  }

  // Update getConfig
  if (!code.includes('SupabaseService.getSoulTargetConfig()')) {
    const target = 'static async getConfig(): Promise<SoulTargetConfig> {';
    const replacement = `static async getConfig(): Promise<SoulTargetConfig> {
    // 1. Primary: Try Supabase
    const supaConfig = await SupabaseService.getSoulTargetConfig();
    if (supaConfig) {
      setStoredConfig(supaConfig);
      return supaConfig;
    }`;
    code = code.replace(target, replacement);
  }

  // Update updateTarget
  if (!code.includes('SupabaseService.upsertSoulTargetConfig(updated)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'soulTargets\', \'target-2026\'), updated, { merge: true });';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'soulTargets\', \'target-2026\'), updated, { merge: true });';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.upsertSoulTargetConfig(updated);
    } catch (err) {
      console.warn('Supabase soul target sync notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'soulTargets', 'target-2026'), updated, { merge: true });`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Updated soulTargetService.ts with Supabase adapter');
}

// ==============================================================================
// 6. UPDATE teachingMaterialService.ts
// ==============================================================================
function updateTeachingMaterialService() {
  const filePath = path.join(root, 'src', 'services', 'teachingMaterialService.ts');
  let code = fs.readFileSync(filePath, 'utf8');

  if (!code.includes("import { SupabaseService } from './supabaseService';")) {
    code = code.replace(
      "import { db, isFirebaseConfigured } from './firebase';",
      "import { db, isFirebaseConfigured } from './firebase';\nimport { SupabaseService } from './supabaseService';"
    );
  }

  if (!code.includes('SupabaseService.getTeachingMaterials()')) {
    const target = 'static async getMaterials(isAdmin = false): Promise<TeachingMaterial[]> {';
    const replacement = `static async getMaterials(isAdmin = false): Promise<TeachingMaterial[]> {
    // 1. Primary: Try Supabase
    const supaMaterials = await SupabaseService.getTeachingMaterials();
    if (supaMaterials && supaMaterials.length > 0) {
      setStoredMaterials(supaMaterials);
      return isAdmin ? supaMaterials : supaMaterials.filter(m => m.status === 'published');
    }`;
    code = code.replace(target, replacement);
  }

  if (!code.includes('SupabaseService.upsertTeachingMaterial(record)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'teachingMaterials\', id), record);';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'teachingMaterials\', id), record);';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.upsertTeachingMaterial(record);
    } catch (err) {
      console.warn('Supabase teaching material notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'teachingMaterials', id), record);`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Updated teachingMaterialService.ts with Supabase adapter');
}

// ==============================================================================
// 7. UPDATE messagingService.ts
// ==============================================================================
function updateMessagingService() {
  const filePath = path.join(root, 'src', 'services', 'messagingService.ts');
  let code = fs.readFileSync(filePath, 'utf8');

  if (!code.includes("import { SupabaseService } from './supabaseService';")) {
    code = code.replace(
      "import { db, isFirebaseConfigured } from './firebase';",
      "import { db, isFirebaseConfigured } from './firebase';\nimport { SupabaseService } from './supabaseService';"
    );
  }

  if (!code.includes('SupabaseService.sendPrivateMessage(msg)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'privateMessages\', id), msg);';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'privateMessages\', id), msg);';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.sendPrivateMessage(msg);
    } catch (err) {
      console.warn('Supabase private message notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'privateMessages', id), msg);`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  if (!code.includes('SupabaseService.sendCommunityMessage(msg)')) {
    const target = 'if (isFirebaseConfigured && db) {\r\n      try {\r\n        await setDoc(doc(db, \'communityMessages\', id), msg);';
    const altTarget = 'if (isFirebaseConfigured && db) {\n      try {\n        await setDoc(doc(db, \'communityMessages\', id), msg);';
    const replacement = `// Dual-write to Supabase
    try {
      await SupabaseService.sendCommunityMessage(msg);
    } catch (err) {
      console.warn('Supabase community message notice:', err);
    }

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'communityMessages', id), msg);`;
    if (code.includes(target)) {
      code = code.replace(target, replacement);
    } else if (code.includes(altTarget)) {
      code = code.replace(altTarget, replacement);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log('✅ Updated messagingService.ts with Supabase adapter');
}

// Run all
updateReportService();
updateFollowUpService();
updateFinanceService();
updateSettingsService();
updateSoulTargetService();
updateTeachingMaterialService();
updateMessagingService();
console.log('🎉 All core services updated successfully with Supabase adapter layer!');
