import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type FniCallKind = 'voice' | 'video';
export type FniCallSignalType = 'offer' | 'answer' | 'ice-candidate' | 'hangup' | 'decline';

export interface FniCallSignal {
  callId: string;
  fromProfileId: string;
  kind?: FniCallKind;
  type: FniCallSignalType;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
  sentAt: string;
}

export class CallService {
  static createSessionId(): string {
    return crypto.randomUUID();
  }

  static createChannel(
    callId: string,
    callerProfileId: string,
    recipientProfileId: string,
  ): RealtimeChannel {
    void callId; // Session identity is carried by signals, not the stable participant topic.
    if (!supabase) throw new Error('FNI calling is unavailable because the secure connection is not configured.');
    const [firstParticipant, secondParticipant] = [callerProfileId, recipientProfileId].sort();
    // One stable direct-chat channel lets the other participant receive an incoming
    // call while this conversation is open. The unique callId stays in each signal.
    return supabase.channel(
      `fni-call:direct:${firstParticipant}:${secondParticipant}`,
      {
        config: {
          private: true,
          broadcast: { self: false },
        },
      },
    );
  }

  static listen(
    channel: RealtimeChannel,
    onSignal: (signal: FniCallSignal) => void,
  ): RealtimeChannel {
    channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      if (!payload || typeof payload !== 'object') return;
      const signal = payload as FniCallSignal;
      if (
        typeof signal.callId !== 'string' ||
        typeof signal.fromProfileId !== 'string' ||
        typeof signal.type !== 'string'
      ) return;
      onSignal(signal);
    });
    return channel;
  }

  static async connect(channel: RealtimeChannel): Promise<void> {
    await supabase.realtime.setAuth();
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('The secure call channel timed out.')), 12000);
      channel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(timeout);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          window.clearTimeout(timeout);
          reject(new Error(`Unable to connect to the secure call channel (${status}).`));
        }
      });
    });
  }

  static async send(channel: RealtimeChannel, signal: FniCallSignal): Promise<void> {
    const result = await channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: signal,
    });
    if (result !== 'ok') throw new Error('The call signal could not be delivered.');
  }

  static async disconnect(channel: RealtimeChannel | null): Promise<void> {
    if (channel && supabase) await supabase.removeChannel(channel);
  }
}
