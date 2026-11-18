import { supabase } from '../lib/supabase';
import {
  CallSession,
  CallParticipant,
  CallHistoryRecord,
  CallType,
  CallMode,
  CallStatus,
  CallBlockedUser,
} from '../types/calling';
import { NotificationService } from './notificationService';
import { PushNotificationService } from './pushNotificationService';

export class CallSignalingService {
  // Generate a distinct room ID
  static generateRoomId(prefix: 'direct' | 'group' | 'cell' = 'direct'): string {
    const randomHex = Math.random().toString(36).substring(2, 10);
    return `fni-${prefix}-${Date.now().toString(36)}-${randomHex}`;
  }

  // ---------------------------------------------------------------------------
  // 1. INITIATE DIRECT CALL (1-on-1)
  // ---------------------------------------------------------------------------
  static async initiateCall(params: {
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    callerCell?: string;
    receiverId: string;
    receiverName: string;
    receiverAvatar?: string;
    callType: CallType;
  }): Promise<CallSession> {
    if (!supabase) throw new Error('Supabase client is not available.');

    // Check if recipient has blocked caller
    const isBlocked = await this.isUserBlocked(params.receiverId, params.callerId);
    if (isBlocked) {
      throw new Error('Unable to connect call to this recipient.');
    }

    const roomId = this.generateRoomId('direct');
    const newSession: Partial<CallSession> = {
      caller_id: params.callerId,
      caller_name: params.callerName,
      caller_avatar: params.callerAvatar,
      caller_cell: params.callerCell,
      receiver_id: params.receiverId,
      receiver_name: params.receiverName,
      receiver_avatar: params.receiverAvatar,
      room_id: roomId,
      call_type: params.callType,
      call_mode: 'direct',
      status: 'ringing',
      started_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('call_sessions')
      .insert(newSession)
      .select()
      .single();

    if (error || !data) {
      console.error('Call session could not be persisted:', error);
      throw error || new Error('The call could not be started. Please try again.');
    }

    const session = data as CallSession;
    this.dispatchCallNotifications(session);
    return session;
  }

  // Dispatch background & push notifications for incoming call
  private static async dispatchCallNotifications(session: CallSession) {
    if (!session.receiver_id) return;

    try {
      // In-app Notification
      await NotificationService.createNotification({
        userId: session.receiver_id,
        type: 'incoming_call',
        title: `Incoming ${session.call_type === 'video' ? 'Video' : 'Voice'} Call`,
        message: `${session.caller_name} is calling you on FNI Cells Connect`,
        metadata: {
          targetTab: 'messages',
          callId: session.id,
          roomId: session.room_id,
          callType: session.call_type,
          callerName: session.caller_name,
        },
      });

      // Browser Web Push / Local System Notification
      PushNotificationService.showLocalNotification(
        `Incoming FNI ${session.call_type === 'video' ? 'Video' : 'Voice'} Call`,
        {
          body: `${session.caller_name} is calling you. Tap to answer.`,
          tag: `fni-call-${session.id}`,
          data: {
            url: window.location.origin + window.location.pathname + '#call-' + session.id,
            callId: session.id,
          },
        }
      );
    } catch (e) {
      console.warn('Failed to dispatch call notification:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. ANSWER CALL
  // ---------------------------------------------------------------------------
  static async answerCall(sessionId: string): Promise<void> {
    if (!supabase) return;
    const answeredAt = new Date().toISOString();
    await supabase
      .from('call_sessions')
      .update({
        status: 'accepted',
        answered_at: answeredAt,
      })
      .eq('id', sessionId);
  }

  // ---------------------------------------------------------------------------
  // 3. DECLINE OR BUSY CALL
  // ---------------------------------------------------------------------------
  static async declineCall(sessionId: string, reason: 'declined' | 'busy' = 'declined'): Promise<void> {
    if (!supabase) return;
    const endedAt = new Date().toISOString();
    await supabase
      .from('call_sessions')
      .update({
        status: reason,
        ended_at: endedAt,
      })
      .eq('id', sessionId);
  }

  // ---------------------------------------------------------------------------
  // 4. END CALL
  // ---------------------------------------------------------------------------
  static async endCall(session: CallSession, durationSeconds = 0): Promise<void> {
    const endedAt = new Date().toISOString();

    if (supabase) {
      await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: endedAt,
          duration_seconds: durationSeconds,
        })
        .eq('id', session.id);
    }

    // Save Call History for both caller and receiver
    await this.recordCallHistory(session, durationSeconds);
  }

  // ---------------------------------------------------------------------------
  // 5. CALL HISTORY RECORDING
  // ---------------------------------------------------------------------------
  static async recordCallHistory(session: CallSession, durationSeconds: number): Promise<void> {
    if (!supabase) return;

    try {
      // Caller Record (Outgoing)
      const callerRecord: Partial<CallHistoryRecord> = {
        session_id: session.id,
        user_id: session.caller_id,
        peer_id: session.receiver_id,
        peer_name: session.receiver_name || session.room_title || 'FNI Room',
        peer_avatar: session.receiver_avatar,
        direction: 'outgoing',
        call_type: session.call_type,
        call_mode: session.call_mode,
        duration_seconds: durationSeconds,
        room_title: session.room_title,
      };

      // Receiver Record (Incoming or Missed)
      const wasAnswered = Boolean(session.answered_at) || durationSeconds > 0;
      const receiverRecord: Partial<CallHistoryRecord> | null = session.receiver_id
        ? {
            session_id: session.id,
            user_id: session.receiver_id,
            peer_id: session.caller_id,
            peer_name: session.caller_name,
            peer_avatar: session.caller_avatar,
            peer_cell: session.caller_cell,
            direction: wasAnswered ? 'incoming' : 'missed',
            call_type: session.call_type,
            call_mode: session.call_mode,
            duration_seconds: durationSeconds,
            room_title: session.room_title,
          }
        : null;

      const records = [callerRecord];
      if (receiverRecord) records.push(receiverRecord);

      await supabase.from('call_history').insert(records);

      // If missed call, trigger a Missed Call Notification to receiver
      if (session.receiver_id && !wasAnswered) {
        await NotificationService.createNotification({
          userId: session.receiver_id,
          type: 'missed_call',
          title: 'Missed Call',
          message: `Missed ${session.call_type} call from ${session.caller_name}`,
          metadata: {
            targetTab: 'call-history',
          },
        });
      }
    } catch (e) {
      console.warn('Could not persist call history:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. FETCH CALL HISTORY
  // ---------------------------------------------------------------------------
  static async getCallHistory(userId: string): Promise<CallHistoryRecord[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as CallHistoryRecord[]) || [];
    } catch (e) {
      console.warn('Failed to load call history:', e);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // 7. GROUP & CELL MEETINGS
  // ---------------------------------------------------------------------------
  static async createGroupMeeting(params: {
    hostId: string;
    hostName: string;
    hostAvatar?: string;
    title: string;
    callType: CallType;
    callMode: 'group' | 'cell';
    cellId?: string;
    invitedMemberIds?: string[];
  }): Promise<CallSession> {
    if (!supabase) throw new Error('Supabase client unavailable');

    const roomId = this.generateRoomId(params.callMode);
    const newSession: Partial<CallSession> = {
      caller_id: params.hostId,
      caller_name: params.hostName,
      caller_avatar: params.hostAvatar,
      room_id: roomId,
      room_title: params.title,
      call_type: params.callType,
      call_mode: params.callMode,
      cell_id: params.cellId,
      status: 'accepted', // Active immediately
      started_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('call_sessions')
      .insert(newSession)
      .select()
      .single();

    if (error || !data) {
      throw error || new Error('Could not create group meeting.');
    }

    const session = data as CallSession;

    // Add host as first participant
    await supabase.from('call_participants').insert({
      session_id: session.id,
      user_id: params.hostId,
      user_name: params.hostName,
      user_avatar: params.hostAvatar,
      role: 'host',
      is_muted: false,
      is_video_enabled: params.callType === 'video',
    });

    // Notify invited members or cell members
    if (params.invitedMemberIds && params.invitedMemberIds.length > 0) {
      for (const memberId of params.invitedMemberIds) {
        if (memberId === params.hostId) continue;
        NotificationService.createNotification({
          userId: memberId,
          type: 'meeting_started',
          title: `Cell Meeting Started: ${params.title}`,
          message: `${params.hostName} started a ${params.callType} meeting. Tap to join.`,
          metadata: {
            targetTab: 'messages',
            roomId: session.room_id,
            sessionId: session.id,
            callType: params.callType,
          },
        }).catch(() => {});
      }
    }

    return session;
  }

  // ---------------------------------------------------------------------------
  // 8. BLOCK & REPORT USERS
  // ---------------------------------------------------------------------------
  static async blockUser(userId: string, blockedUserId: string, reason?: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('call_blocked_users').upsert({
      user_id: userId,
      blocked_user_id: blockedUserId,
      reason,
    });
  }

  static async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    if (!supabase) return;
    await supabase
      .from('call_blocked_users')
      .delete()
      .eq('user_id', userId)
      .eq('blocked_user_id', blockedUserId);
  }

  static async isUserBlocked(userId: string, targetUserId: string): Promise<boolean> {
    if (!supabase) throw new Error('Call blocking is unavailable because Supabase is not connected.');
    const { data, error } = await supabase
      .from('call_blocked_users')
      .select('id')
      .eq('user_id', userId)
      .eq('blocked_user_id', targetUserId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  // ---------------------------------------------------------------------------
  // 9. REALTIME INCOMING CALL LISTENER
  // ---------------------------------------------------------------------------
  static subscribeToIncomingCalls(
    userId: string,
    onIncoming: (session: CallSession) => void,
    onStatusChange?: (session: CallSession) => void
  ) {
    if (!supabase) return () => {};

    const channel = supabase
      .channel(`fni-calls-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_sessions',
        },
        payload => {
          const session = payload.new as CallSession;
          if (!session) return;

          // Incoming call for this user
          if (session.receiver_id === userId && session.status === 'ringing') {
            onIncoming(session);
          } else if (onStatusChange) {
            onStatusChange(session);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // ---------------------------------------------------------------------------
  // 10. AUDIO SOUND FEEDBACK (Synthesizer via Web Audio API)
  // ---------------------------------------------------------------------------
  private static audioCtx: AudioContext | null = null;
  private static ringInterval: number | null = null;

  private static getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play realistic calling ringback tone (dial tone for caller)
  static startRingbackTone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playBeep = () => {
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.8);
        osc2.stop(ctx.currentTime + 1.8);
      } catch {}
    };

    playBeep();
    this.ringInterval = window.setInterval(playBeep, 4000);
  }

  // Play melodic incoming call chime for receiver
  static startIncomingRingtone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const playChime = () => {
      try {
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + idx * 0.18;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.55);
        });
      } catch {}
    };

    playChime();
    this.ringInterval = window.setInterval(playChime, 3000);
  }

  // Stop any active ringtone
  static stopRingtone() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  // Play short call-ended tone
  static playCallEndedTone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }
}
