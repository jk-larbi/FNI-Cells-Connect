import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src', 'services', 'supabaseService.ts');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Fix mapNotificationFromDb
const targetNotif = `function mapNotificationFromDb(row: any): NotificationItem {
  return {
    id: row.id,
    recipient_target: row.recipient_target,
    title: row.title,
    message: row.message,
    date: row.date,
    is_read: Boolean(row.is_read),
    notification_type: row.notification_type,
    metadata: row.metadata || {},
    created_at: row.created_at,
  };
}`;

const replaceNotif = `function mapNotificationFromDb(row: any): NotificationItem {
  return {
    id: row.id,
    user_id: row.recipient_target,
    title: row.title || 'Notification',
    message: row.message,
    type: (row.notification_type || 'system_alert') as any,
    channel: 'in_app',
    is_read: Boolean(row.is_read),
    metadata: row.metadata || {},
    created_at: row.created_at || new Date().toISOString(),
  };
}`;

if (code.includes(targetNotif)) {
  code = code.replace(targetNotif, replaceNotif);
} else {
  code = code.replace(targetNotif.replace(/\n/g, '\r\n'), replaceNotif.replace(/\n/g, '\r\n'));
}

// 2. Fix SoulTargetConfig in supabaseService
const targetSoul = `  static async getSoulTargetConfig(year: number = 2026): Promise<SoulTargetConfig | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('soul_targets')
        .select('*')
        .eq('year', year)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        year: data.year,
        annualTarget: data.annual_target,
        quarterlyTargets: data.quarterly_targets || { q1: 1250, q2: 1250, q3: 1250, q4: 1250 },
        description: data.description || '',
        updatedAt: data.updated_at,
        updatedBy: data.updated_by || '',
      };
    } catch (err) {
      return null;
    }
  }

  static async upsertSoulTargetConfig(config: SoulTargetConfig): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: config.id,
        year: config.year,
        annual_target: config.annualTarget,
        quarterly_targets: config.quarterlyTargets || {},
        description: config.description || '',
        updated_by: config.updatedBy || '',
      };
      const { error } = await supabase!.from('soul_targets').upsert(payload, { onConflict: 'year' });
      return !error;
    } catch (err) {
      return false;
    }
  }`;

const replaceSoul = `  static async getSoulTargetConfig(year: number = 2026): Promise<SoulTargetConfig | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('soul_targets')
        .select('*')
        .eq('year', year)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        year: data.year,
        annualTarget: data.annual_target,
        auditHistory: Array.isArray(data.audit_history) ? data.audit_history : [],
        updatedAt: data.updated_at,
        updatedBy: data.updated_by || 'Administrator',
      };
    } catch (err) {
      return null;
    }
  }

  static async upsertSoulTargetConfig(config: SoulTargetConfig): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: config.id,
        year: config.year,
        annual_target: config.annualTarget,
        audit_history: config.auditHistory || [],
        description: \`National Soul-Winning Milestone Target for \${config.year}\`,
        updated_by: config.updatedBy || '',
      };
      const { error } = await supabase!.from('soul_targets').upsert(payload, { onConflict: 'year' });
      return !error;
    } catch (err) {
      return false;
    }
  }`;

if (code.includes(targetSoul)) {
  code = code.replace(targetSoul, replaceSoul);
} else {
  code = code.replace(targetSoul.replace(/\n/g, '\r\n'), replaceSoul.replace(/\n/g, '\r\n'));
}

// 3. Fix SystemSettings in supabaseService
const targetSettings = `  static async getSystemSettings(): Promise<SystemSettings | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('system_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();
      if (error || !data) return null;
      return {
        ministryName: data.ministry_name || 'Forerunners Network International (FNI)',
        vision: data.vision || '',
        mission: data.mission || '',
        submissionDeadlineDay: data.submission_deadline_day || 'Sunday',
        submissionDeadlineTime: data.submission_deadline_time || '18:00',
        annualSoulTarget: data.annual_soul_target || 5000,
        enableEmailNotifications: data.enable_email_notifications ?? true,
        enableWhatsAppNotifications: data.enable_whatsapp_notifications ?? true,
        updatedAt: data.updated_at,
        updatedBy: data.updated_by || '',
      };
    } catch (err) {
      return null;
    }
  }

  static async upsertSystemSettings(settings: SystemSettings): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: 'global',
        ministry_name: settings.ministryName,
        vision: settings.vision,
        mission: settings.mission,
        submission_deadline_day: settings.submissionDeadlineDay,
        submission_deadline_time: settings.submissionDeadlineTime,
        annual_soul_target: settings.annualSoulTarget,
        enable_email_notifications: settings.enableEmailNotifications,
        enable_whatsapp_notifications: settings.enableWhatsAppNotifications,
        updated_by: settings.updatedBy || '',
      };
      const { error } = await supabase!.from('system_settings').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
      return false;
    }
  }`;

const replaceSettings = `  static async getSystemSettings(): Promise<SystemSettings | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('system_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: 'general',
        vision: data.vision || '',
        mission: data.mission || '',
        annualSoulWinningTarget: data.annual_soul_target || 5000,
        weeklyDeadline: 'Sunday at 6:00 PM Ghana Time (Africa/Accra, UTC+0)',
        updatedAt: data.updated_at || new Date().toISOString(),
        updatedBy: data.updated_by || 'Administrator',
      };
    } catch (err) {
      return null;
    }
  }

  static async upsertSystemSettings(settings: SystemSettings): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: 'global',
        ministry_name: 'Forerunners Network International (FNI)',
        vision: settings.vision,
        mission: settings.mission,
        submission_deadline_day: 'Sunday',
        submission_deadline_time: '18:00',
        annual_soul_target: settings.annualSoulWinningTarget,
        enable_email_notifications: true,
        enable_whatsapp_notifications: true,
        updated_by: settings.updatedBy || '',
      };
      const { error } = await supabase!.from('system_settings').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
      return false;
    }
  }`;

if (code.includes(targetSettings)) {
  code = code.replace(targetSettings, replaceSettings);
} else {
  code = code.replace(targetSettings.replace(/\n/g, '\r\n'), replaceSettings.replace(/\n/g, '\r\n'));
}

// 4. Fix insertNotification
const targetInsertNotif = `  static async insertNotification(item: NotificationItem): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: item.id,
        recipient_target: item.recipient_target,
        title: item.title,
        message: item.message,
        date: item.date || new Date().toISOString().split('T')[0],
        is_read: Boolean(item.is_read),
        notification_type: item.notification_type || 'system_alert',
        metadata: item.metadata || {},
      };
      const { error } = await supabase!.from('notifications').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
      return false;
    }
  }`;

const replaceInsertNotif = `  static async insertNotification(item: NotificationItem): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload = {
        id: item.id,
        recipient_target: item.user_id,
        title: item.title,
        message: item.message,
        date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        is_read: Boolean(item.is_read),
        notification_type: item.type || 'system_alert',
        metadata: item.metadata || {},
      };
      const { error } = await supabase!.from('notifications').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
      return false;
    }
  }`;

if (code.includes(targetInsertNotif)) {
  code = code.replace(targetInsertNotif, replaceInsertNotif);
} else {
  code = code.replace(targetInsertNotif.replace(/\n/g, '\r\n'), replaceInsertNotif.replace(/\n/g, '\r\n'));
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Successfully patched supabaseService.ts types!');
