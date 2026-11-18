import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  CallSession,
  CallType,
  CallMode,
  CallParticipant,
} from '../types/calling';
import { CallSignalingService } from '../services/callSignalingService';
import {
  LivekitCallingService,
  CallConnectionState,
} from '../services/livekitCallingService';

interface RemoteParticipantState {
  id: string;
  name: string;
  avatar?: string;
  stream: MediaStream;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
}

interface CallContextType {
  activeSession: CallSession | null;
  incomingSession: CallSession | null;
  connectionState: CallConnectionState;
  callDuration: number;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteParticipants: RemoteParticipantState[];
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  activeSpeakers: string[];
  isCallMinimized: boolean;
  setIsCallMinimized: (minimized: boolean) => void;

  startDirectCall: (recipient: {
    id: string;
    name: string;
    avatar?: string;
    cell?: string;
  }, callType: CallType) => Promise<void>;

  startCellMeeting: (params: {
    cellId: string;
    cellName: string;
    callType: CallType;
    invitedMemberIds?: string[];
  }) => Promise<void>;

  startGroupMeeting: (params: {
    title: string;
    callType: CallType;
    invitedMemberIds?: string[];
  }) => Promise<void>;

  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMicrophone: () => boolean;
  toggleCamera: () => boolean;
  flipCamera: () => Promise<void>;
  toggleSpeaker: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeSession, setActiveSession] = useState<CallSession | null>(null);
  const [incomingSession, setIncomingSession] = useState<CallSession | null>(null);
  const [connectionState, setConnectionState] = useState<CallConnectionState>('idle');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipantState[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [isCallMinimized, setIsCallMinimized] = useState(false);

  const callingServiceRef = useRef<LivekitCallingService | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize hidden audio element for remote audio playback
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      (audio as any).playsInline = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
      remoteAudioRef.current = audio;

      return () => {
        audio.remove();
      };
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 1. LISTEN FOR INCOMING CALLS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = CallSignalingService.subscribeToIncomingCalls(
      currentUser.id,
      session => {
        // Check the current recipient's own block list before showing or ringing.
        void (async () => {
          try {
            const blocked = await CallSignalingService.isUserBlocked(currentUser.id, session.caller_id);
            if (blocked) {
              await CallSignalingService.declineCall(session.id, 'declined');
              return;
            }

            // If already on an active call, automatically flag as busy.
            if (activeSession) {
              await CallSignalingService.declineCall(session.id, 'busy');
              return;
            }

            setIncomingSession(session);
            CallSignalingService.startIncomingRingtone();
          } catch (error) {
            console.warn('Could not verify incoming call permissions:', error);
            await CallSignalingService.declineCall(session.id, 'failed').catch(() => {});
          }
        })();
      },
      session => {
        // Status change listener: e.g. caller cancelled or ended
        if (incomingSession && incomingSession.id === session.id) {
          if (['declined', 'busy', 'ended', 'failed'].includes(session.status)) {
            CallSignalingService.stopRingtone();
            setIncomingSession(null);
          }
        }
        if (activeSession && activeSession.id === session.id) {
          if (['declined', 'busy', 'ended'].includes(session.status)) {
            endCall();
          }
        }
      }
    );

    return () => {
      unsubscribe();
      CallSignalingService.stopRingtone();
    };
  }, [currentUser?.id, activeSession, incomingSession]);

  // Duration Timer
  useEffect(() => {
    if (connectionState === 'connected' && activeSession) {
      durationTimerRef.current = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [connectionState, activeSession]);

  // ---------------------------------------------------------------------------
  // 2. INITIALIZE CALL SERVICE INSTANCE
  // ---------------------------------------------------------------------------
  const getCallingService = useCallback(() => {
    if (!callingServiceRef.current) {
      callingServiceRef.current = new LivekitCallingService({
        onConnectionStateChanged: state => {
          setConnectionState(state);
          if (state === 'connected') {
            CallSignalingService.stopRingtone();
          } else if (state === 'disconnected' || state === 'failed') {
            CallSignalingService.playCallEndedTone();
          }
        },
        onLocalStreamAvailable: stream => {
          setLocalStream(stream);
        },
        onRemoteTrackSubscribed: (participantId, track, stream) => {
          setRemoteStream(stream);
          if (remoteAudioRef.current && track.kind === 'audio') {
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.play().catch(() => {});
          }

          setRemoteParticipants(prev => {
            const exists = prev.find(p => p.id === participantId);
            if (exists) {
              return prev.map(p => (p.id === participantId ? { ...p, stream } : p));
            }
            return [
              ...prev,
              {
                id: participantId,
                name: participantId,
                stream,
              },
            ];
          });
        },
        onRemoteTrackUnsubscribed: (participantId, track) => {
          if (track.kind === 'video') {
            setRemoteParticipants(prev =>
              prev.map(p => (p.id === participantId ? { ...p, isVideoEnabled: false } : p))
            );
          }
        },
        onActiveSpeakersChanged: speakerIds => {
          setActiveSpeakers(speakerIds);
        },
        onParticipantJoined: p => {
          setRemoteParticipants(prev => {
            if (prev.some(item => item.id === p.id)) return prev;
            return [...prev, { id: p.id, name: p.name, stream: new MediaStream() }];
          });
        },
        onParticipantLeft: participantId => {
          setRemoteParticipants(prev => prev.filter(p => p.id !== participantId));
        },
        onError: err => {
          console.error('Calling service runtime error:', err);
        },
      });
    }
    return callingServiceRef.current;
  }, []);

  // ---------------------------------------------------------------------------
  // 3. START DIRECT CALL (1-on-1)
  // ---------------------------------------------------------------------------
  const startDirectCall = async (
    recipient: {
      id: string;
      name: string;
      avatar?: string;
      cell?: string;
    },
    callType: CallType
  ) => {
    if (!currentUser) return;

    try {
      setCallDuration(0);
      setIsCallMinimized(false);
      setIsMuted(false);
      setIsVideoEnabled(callType === 'video');

      // 1. Create DB call session
      const session = await CallSignalingService.initiateCall({
        callerId: currentUser.id,
        callerName: currentUser.full_name || 'FNI Leader',
        callerAvatar: currentUser.avatar_url,
        callerCell: currentUser.cell_name,
        receiverId: recipient.id,
        receiverName: recipient.name,
        receiverAvatar: recipient.avatar,
        callType,
      });

      setActiveSession(session);
      setConnectionState('initiating');

      // Start ringing audio for caller
      CallSignalingService.startRingbackTone();

      // 2. Connect WebRTC media
      const service = getCallingService();
      await service.connect({
        roomName: session.room_id,
        username: currentUser.full_name || 'FNI Leader',
        callType,
        isHost: true,
        currentUserId: currentUser.id,
        remoteUserId: recipient.id,
        callId: session.id,
      });
    } catch (err: any) {
      CallSignalingService.stopRingtone();
      setActiveSession(null);
      setConnectionState('idle');
      alert(err.message || 'Unable to establish call. Please check camera and microphone permissions.');
    }
  };

  // ---------------------------------------------------------------------------
  // 4. START CELL MEETING
  // ---------------------------------------------------------------------------
  const startCellMeeting = async (params: {
    cellId: string;
    cellName: string;
    callType: CallType;
    invitedMemberIds?: string[];
  }) => {
    if (!currentUser) return;

    try {
      setCallDuration(0);
      setIsCallMinimized(false);
      setIsMuted(false);
      setIsVideoEnabled(params.callType === 'video');

      const session = await CallSignalingService.createGroupMeeting({
        hostId: currentUser.id,
        hostName: currentUser.full_name || 'Cell Tutor',
        hostAvatar: currentUser.avatar_url,
        title: `${params.cellName} Cell Fellowship`,
        callType: params.callType,
        callMode: 'cell',
        cellId: params.cellId,
        invitedMemberIds: params.invitedMemberIds,
      });

      setActiveSession(session);
      setConnectionState('initiating');

      const service = getCallingService();
      await service.connect({
        roomName: session.room_id,
        username: currentUser.full_name || 'Cell Tutor',
        callType: params.callType,
        isHost: true,
        currentUserId: currentUser.id,
        callId: session.id,
      });
    } catch (err: any) {
      setActiveSession(null);
      setConnectionState('idle');
      alert(err.message || 'Could not launch cell meeting.');
    }
  };

  // ---------------------------------------------------------------------------
  // 5. START GROUP MEETING
  // ---------------------------------------------------------------------------
  const startGroupMeeting = async (params: {
    title: string;
    callType: CallType;
    invitedMemberIds?: string[];
  }) => {
    if (!currentUser) return;

    try {
      setCallDuration(0);
      setIsCallMinimized(false);
      setIsMuted(false);
      setIsVideoEnabled(params.callType === 'video');

      const session = await CallSignalingService.createGroupMeeting({
        hostId: currentUser.id,
        hostName: currentUser.full_name || 'Administrator',
        hostAvatar: currentUser.avatar_url,
        title: params.title,
        callType: params.callType,
        callMode: 'group',
        invitedMemberIds: params.invitedMemberIds,
      });

      setActiveSession(session);
      setConnectionState('initiating');

      const service = getCallingService();
      await service.connect({
        roomName: session.room_id,
        username: currentUser.full_name || 'Administrator',
        callType: params.callType,
        isHost: true,
        currentUserId: currentUser.id,
        callId: session.id,
      });
    } catch (err: any) {
      setActiveSession(null);
      setConnectionState('idle');
      alert(err.message || 'Could not launch group meeting.');
    }
  };

  // ---------------------------------------------------------------------------
  // 6. ACCEPT INCOMING CALL
  // ---------------------------------------------------------------------------
  const acceptIncomingCall = async () => {
    if (!incomingSession || !currentUser) return;

    CallSignalingService.stopRingtone();
    const session = incomingSession;
    setIncomingSession(null);
    setActiveSession(session);
    setCallDuration(0);
    setIsCallMinimized(false);
    setIsMuted(false);
    setIsVideoEnabled(session.call_type === 'video');

    try {
      // 1. Mark accepted in DB
      await CallSignalingService.answerCall(session.id);

      // 2. Connect WebRTC media
      const service = getCallingService();
      await service.connect({
        roomName: session.room_id,
        username: currentUser.full_name || 'FNI Member',
        callType: session.call_type,
        isHost: false,
        currentUserId: currentUser.id,
        remoteUserId: session.caller_id,
        callId: session.id,
      });
    } catch (err: any) {
      setActiveSession(null);
      setConnectionState('idle');
      alert(err.message || 'Failed to connect incoming call.');
    }
  };

  // ---------------------------------------------------------------------------
  // 7. DECLINE INCOMING CALL
  // ---------------------------------------------------------------------------
  const declineIncomingCall = async () => {
    if (!incomingSession) return;
    CallSignalingService.stopRingtone();
    const session = incomingSession;
    setIncomingSession(null);

    await CallSignalingService.declineCall(session.id, 'declined');
    await CallSignalingService.recordCallHistory(session, 0);
  };

  // ---------------------------------------------------------------------------
  // 8. END CURRENT CALL
  // ---------------------------------------------------------------------------
  const endCall = async () => {
    CallSignalingService.stopRingtone();
    CallSignalingService.playCallEndedTone();

    if (callingServiceRef.current) {
      await callingServiceRef.current.disconnect();
      callingServiceRef.current = null;
    }

    if (activeSession) {
      await CallSignalingService.endCall(activeSession, callDuration);
    }

    setActiveSession(null);
    setConnectionState('idle');
    setCallDuration(0);
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteParticipants([]);
    setIsCallMinimized(false);
    setActiveSpeakers([]);
  };

  // ---------------------------------------------------------------------------
  // 9. CONTROLS: MUTE, VIDEO, FLIP CAMERA, SPEAKER
  // ---------------------------------------------------------------------------
  const toggleMicrophone = (): boolean => {
    if (!callingServiceRef.current) return false;
    const newMuted = !isMuted;
    const active = callingServiceRef.current.toggleMicrophone(!newMuted);
    setIsMuted(!active);
    return !active;
  };

  const toggleCamera = (): boolean => {
    if (!callingServiceRef.current) return false;
    const newVideo = !isVideoEnabled;
    const active = callingServiceRef.current.toggleCamera(newVideo);
    setIsVideoEnabled(active);
    return active;
  };

  const flipCamera = async () => {
    if (!callingServiceRef.current) return;
    await callingServiceRef.current.flipCamera();
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(prev => !prev);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
    }
  };

  return (
    <CallContext.Provider
      value={{
        activeSession,
        incomingSession,
        connectionState,
        callDuration,
        localStream,
        remoteStream,
        remoteParticipants,
        isMuted,
        isVideoEnabled,
        isSpeakerOn,
        activeSpeakers,
        isCallMinimized,
        setIsCallMinimized,
        startDirectCall,
        startCellMeeting,
        startGroupMeeting,
        acceptIncomingCall,
        declineIncomingCall,
        endCall,
        toggleMicrophone,
        toggleCamera,
        flipCamera,
        toggleSpeaker,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
