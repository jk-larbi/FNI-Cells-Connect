export type CallType = 'voice' | 'video';
export type CallMode = 'direct' | 'group' | 'cell';
export type CallStatus =
  | 'initiating'
  | 'ringing'
  | 'accepted'
  | 'connected'
  | 'declined'
  | 'busy'
  | 'missed'
  | 'ended'
  | 'failed';

export interface CallSession {
  id: string;
  caller_id: string;
  caller_name: string;
  caller_avatar?: string;
  caller_cell?: string;
  receiver_id?: string;
  receiver_name?: string;
  receiver_avatar?: string;
  room_id: string;
  room_title?: string;
  call_type: CallType;
  call_mode: CallMode;
  cell_id?: string;
  status: CallStatus;
  started_at?: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface CallParticipant {
  id: string;
  session_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_cell?: string;
  role: 'host' | 'participant';
  is_muted: boolean;
  is_video_enabled: boolean;
  is_speaking: boolean;
  joined_at: string;
  left_at?: string;
}

export interface CallHistoryRecord {
  id: string;
  session_id: string;
  user_id: string;
  peer_id?: string;
  peer_name: string;
  peer_avatar?: string;
  peer_cell?: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  call_type: CallType;
  call_mode: CallMode;
  duration_seconds: number;
  room_title?: string;
  created_at: string;
}

export interface CallBlockedUser {
  id: string;
  user_id: string;
  blocked_user_id: string;
  blocked_user_name?: string;
  reason?: string;
  created_at: string;
}

export interface CallSignal {
  callId: string;
  fromProfileId: string;
  fromProfileName?: string;
  fromProfileAvatar?: string;
  toProfileId?: string;
  kind: CallType;
  type:
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'hangup'
    | 'decline'
    | 'busy'
    | 'ringing'
    | 'connected'
    | 'mute-state';
  payload?: any;
  sentAt: string;
}

export interface CallingTokenResponse {
  token: string;
  serverUrl: string;
  room: string;
  mode?: 'livekit' | 'webrtc-mesh';
}
