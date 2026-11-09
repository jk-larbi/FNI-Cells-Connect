import { supabase } from '../lib/supabase';

export class EmailNotificationService {
  private static async dispatch(payload: Record<string, unknown>): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('fni-email-notifications', { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.failed) console.warn('Some FNI notification emails failed:', data.failed, data.failures);
    } catch (error) {
      // Email delivery must not undo a report or material already saved successfully.
      console.warn('FNI email notification could not be delivered:', error);
    }
  }

  static reportSubmitted(reportId: string, reportType: 'meeting' | 'evangelism') {
    return this.dispatch({ action: 'report_submitted', reportId, reportType });
  }

  static materialPublished(materialId: string) {
    return this.dispatch({ action: 'material_published', materialId });
  }

  static announcementPublished(messageId: string) {
    return this.dispatch({ action: 'announcement', messageId });
  }
}
