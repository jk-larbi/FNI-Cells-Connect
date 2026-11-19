import {
  Room,
  RoomEvent,
  VideoPresets,
  AudioPresets,
  Track,
  RemoteParticipant,
  LocalParticipant,
  Participant,
  createLocalTracks,
  LocalAudioTrack,
  LocalVideoTrack,
} from 'livekit-client';
import { supabase } from '../lib/supabase';
import { CallType, CallingTokenResponse } from '../types/calling';
import { CallService, FniCallSignal } from './callService';

export type CallConnectionState =
  | 'idle'
  | 'initiating'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface CallingServiceCallbacks {
  onConnectionStateChanged?: (state: CallConnectionState) => void;
  onLocalStreamAvailable?: (stream: MediaStream) => void;
  onRemoteTrackSubscribed?: (participantId: string, track: MediaStreamTrack, stream: MediaStream) => void;
  onRemoteTrackUnsubscribed?: (participantId: string, track: MediaStreamTrack) => void;
  onActiveSpeakersChanged?: (speakerIds: string[]) => void;
  onParticipantJoined?: (participant: { id: string; name: string }) => void;
  onParticipantLeft?: (participantId: string) => void;
  onError?: (err: Error) => void;
}

export class LivekitCallingService {
  private room: Room | null = null;
  private localStream: MediaStream | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;
  private localVideoTrack: LocalVideoTrack | null = null;
  private currentFacingMode: 'user' | 'environment' = 'user';
  private connectionState: CallConnectionState = 'idle';
  private callbacks: CallingServiceCallbacks = {};
  private remoteStreams: Map<string, MediaStream> = new Map();

  // Direct WebRTC mesh fallback members
  private isMeshMode = false;
  private peerConnection: RTCPeerConnection | null = null;
  private signalingChannel: any = null;
  private directCallId: string | null = null;
  private currentUserId: string | null = null;
  private remoteUserId: string | null = null;
  private audioAnalyserNode: AnalyserNode | null = null;
  private analyserAnimationId: number | null = null;

  constructor(callbacks: CallingServiceCallbacks = {}) {
    this.callbacks = callbacks;
  }

  setCallbacks(callbacks: CallingServiceCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private setConnectionState(state: CallConnectionState) {
    this.connectionState = state;
    this.callbacks.onConnectionStateChanged?.(state);
  }

  // ---------------------------------------------------------------------------
  // 1. TOKEN ACQUISITION (from Supabase Edge Function)
  // ---------------------------------------------------------------------------
  static async getCallingToken(
    roomName: string,
    username: string,
    isHost = false
  ): Promise<CallingTokenResponse> {
    if (!supabase) {
      throw new Error('Supabase client is not available.');
    }

    try {
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { room: roomName, username, isHost },
      });

      if (error || !data) {
        console.error('Secure calling token request failed:', error);
        throw error || new Error('The secure calling service did not return a token.');
      }

      if (data.error) throw new Error(data.error);
      return data as CallingTokenResponse;
    } catch (e: any) {
      console.error('Secure calling token request failed:', e);
      throw e instanceof Error ? e : new Error('The secure calling service is unavailable.');
    }
  }

  // ---------------------------------------------------------------------------
  // 2. CONNECT TO ROOM (LiveKit or WebRTC Mesh)
  // ---------------------------------------------------------------------------
  async connect(params: {
    roomName: string;
    username: string;
    callType: CallType;
    isHost?: boolean;
    currentUserId?: string;
    remoteUserId?: string;
    callId?: string;
  }): Promise<void> {
    this.setConnectionState('connecting');
    this.currentUserId = params.currentUserId || 'me';
    this.remoteUserId = params.remoteUserId || null;
    this.directCallId = params.callId || crypto.randomUUID();

    try {
      // 1. Request microphone & camera permissions first
      await this.acquireLocalMedia(params.callType);

      // 2. Request Token
      const tokenData = await LivekitCallingService.getCallingToken(
        params.roomName,
        params.username,
        params.isHost
      );

      // 3. Connect via LiveKit or Direct WebRTC Mesh
      if (tokenData.mode === 'livekit' && tokenData.token && tokenData.serverUrl) {
        await this.connectLiveKit(tokenData);
      } else {
        // Direct WebRTC signaling over Supabase Realtime
        await this.connectWebRTCMesh(params);
      }

      this.setConnectionState('connected');
    } catch (err: any) {
      console.error('Call connection failed:', err);
      this.setConnectionState('failed');
      this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. MEDIA CAPTURE & HARDWARE PERMISSIONS
  // ---------------------------------------------------------------------------
  private async acquireLocalMedia(callType: CallType): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
        },
        video:
          callType === 'video'
            ? {
                facingMode: { ideal: this.currentFacingMode },
                width: { ideal: 1280, max: 1920, min: 640 },
                height: { ideal: 720, max: 1080, min: 360 },
                aspectRatio: { ideal: 16 / 9 },
                frameRate: { ideal: 30, max: 30, min: 24 },
              }
            : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      this.callbacks.onLocalStreamAvailable?.(stream);

      // Start local speaking detection
      this.setupLocalAudioAnalyser(stream);

      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone or Camera permission was denied. Please allow device access in your browser settings.');
      }
      if (err.name === 'NotFoundError') {
        throw new Error('No camera or microphone device found on this system.');
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. LIVEKIT SFU IMPLEMENTATION
  // ---------------------------------------------------------------------------
  private async connectLiveKit(tokenData: CallingTokenResponse): Promise<void> {
    this.isMeshMode = false;
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
        facingMode: this.currentFacingMode,
      },
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [
          VideoPresets.h180,
          VideoPresets.h360,
          VideoPresets.h720,
        ],
        videoEncoding: {
          maxBitrate: 2_500_000,
          maxFramerate: 30,
        },
        audioPreset: AudioPresets.speech,
        dtx: true,
        red: true,
      },
    });

    // Wire LiveKit Events
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      const pid = participant.identity;
      let participantStream = this.remoteStreams.get(pid);
      if (!participantStream) {
        participantStream = new MediaStream();
        this.remoteStreams.set(pid, participantStream);
      }

      // If a track of this kind already exists in this stream, remove it first
      const existingTrack = participantStream.getTracks().find(t => t.kind === track.kind);
      if (existingTrack) {
        participantStream.removeTrack(existingTrack);
      }
      participantStream.addTrack(track.mediaStreamTrack);

      this.callbacks.onRemoteTrackSubscribed?.(pid, track.mediaStreamTrack, participantStream);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      const pid = participant.identity;
      const participantStream = this.remoteStreams.get(pid);
      if (participantStream) {
        participantStream.removeTrack(track.mediaStreamTrack);
      }
      this.callbacks.onRemoteTrackUnsubscribed?.(pid, track.mediaStreamTrack);
    });

    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      const speakerIds = speakers.map(s => s.identity);
      this.callbacks.onActiveSpeakersChanged?.(speakerIds);
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      this.callbacks.onParticipantJoined?.({
        id: participant.identity,
        name: participant.name || participant.identity,
      });
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.remoteStreams.delete(participant.identity);
      this.callbacks.onParticipantLeft?.(participant.identity);
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      this.setConnectionState('reconnecting');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      this.setConnectionState('connected');
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.setConnectionState('disconnected');
    });

    // Connect to room
    await this.room.connect(tokenData.serverUrl, tokenData.token);

    // Immediately process any participants/tracks already present in the room upon connection
    for (const remoteParticipant of this.room.remoteParticipants.values()) {
      const pid = remoteParticipant.identity;
      this.callbacks.onParticipantJoined?.({
        id: pid,
        name: remoteParticipant.name || pid,
      });

      for (const publication of remoteParticipant.trackPublications.values()) {
        if (publication.track && publication.isSubscribed) {
          const track = publication.track;
          let participantStream = this.remoteStreams.get(pid);
          if (!participantStream) {
            participantStream = new MediaStream();
            this.remoteStreams.set(pid, participantStream);
          }
          const existingTrack = participantStream.getTracks().find(t => t.kind === track.kind);
          if (existingTrack) {
            participantStream.removeTrack(existingTrack);
          }
          participantStream.addTrack(track.mediaStreamTrack);
          this.callbacks.onRemoteTrackSubscribed?.(pid, track.mediaStreamTrack, participantStream);
        }
      }
    }

    // Publish local tracks with high clarity HD settings and robust audio packet recovery
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        if (track.kind === 'audio') {
          await this.room.localParticipant.publishTrack(track, {
            name: 'microphone',
            audioPreset: AudioPresets.speech,
            dtx: true,
            red: true,
          });
        } else if (track.kind === 'video') {
          await this.room.localParticipant.publishTrack(track, {
            name: 'camera',
            simulcast: true,
            videoEncoding: {
              maxBitrate: 2_500_000,
              maxFramerate: 30,
            },
            videoCodec: 'vp8',
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. DIRECT WEBRTC MESH FALLBACK (Zero External Server Dependency)
  // ---------------------------------------------------------------------------
  private async connectWebRTCMesh(params: {
    currentUserId?: string;
    remoteUserId?: string;
    callId?: string;
    isHost?: boolean;
    callType: CallType;
  }): Promise<void> {
    this.isMeshMode = true;
    const currentUid = params.currentUserId || 'me';
    const remoteUid = params.remoteUserId || 'peer';

    // RTCPeerConnection with Google Public STUN
    const rtcConfig: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(rtcConfig);
    this.peerConnection = pc;

    // Attach local stream tracks to PeerConnection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Remote Track Handler - accumulate into unified remote stream
    pc.ontrack = event => {
      let participantStream = this.remoteStreams.get(remoteUid);
      if (!participantStream) {
        participantStream = new MediaStream();
        this.remoteStreams.set(remoteUid, participantStream);
      }
      const existingTrack = participantStream.getTracks().find(t => t.kind === event.track.kind);
      if (existingTrack) {
        participantStream.removeTrack(existingTrack);
      }
      participantStream.addTrack(event.track);

      this.callbacks.onRemoteTrackSubscribed?.(remoteUid, event.track, participantStream);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.setConnectionState('connected');
      } else if (pc.iceConnectionState === 'disconnected') {
        this.setConnectionState('reconnecting');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        this.setConnectionState('disconnected');
      }
    };

    // Signaling Channel via Supabase Realtime
    try {
      const channel = CallService.createChannel(
        this.directCallId || 'fni-call',
        currentUid,
        remoteUid
      );
      this.signalingChannel = channel;

      CallService.listen(channel, async (signal: FniCallSignal) => {
        if (signal.fromProfileId === currentUid) return;

        try {
          if (signal.type === 'offer' && signal.payload) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await CallService.send(channel, {
              callId: this.directCallId || '',
              fromProfileId: currentUid,
              type: 'answer',
              payload: answer,
              sentAt: new Date().toISOString(),
            });
          } else if (signal.type === 'answer' && signal.payload) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit));
          } else if (signal.type === 'ice-candidate' && signal.payload) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload as RTCIceCandidateInit));
          } else if (signal.type === 'hangup' || signal.type === 'decline') {
            this.setConnectionState('disconnected');
          }
        } catch (err) {
          console.warn('Signaling error:', err);
        }
      });

      await CallService.connect(channel);

      // ICE Candidates sending
      pc.onicecandidate = event => {
        if (event.candidate) {
          CallService.send(channel, {
            callId: this.directCallId || '',
            fromProfileId: currentUid,
            type: 'ice-candidate',
            payload: event.candidate.toJSON(),
            sentAt: new Date().toISOString(),
          }).catch(() => {});
        }
      };

      // If caller/host, initiate offer
      if (params.isHost) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await CallService.send(channel, {
          callId: this.directCallId || '',
          fromProfileId: currentUid,
          kind: params.callType,
          type: 'offer',
          payload: offer,
          sentAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Direct signaling init warning (running in local loopback mode):', e);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. IN-CALL CONTROLS: MUTE, VIDEO, FLIP CAMERA, SPEAKER
  // ---------------------------------------------------------------------------
  toggleMicrophone(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return false;

    const newEnabled = enabled !== undefined ? enabled : !audioTrack.enabled;
    audioTrack.enabled = newEnabled;

    if (this.room) {
      this.room.localParticipant.setMicrophoneEnabled(newEnabled);
    }
    return newEnabled;
  }

  toggleCamera(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return false;

    const newEnabled = enabled !== undefined ? enabled : !videoTrack.enabled;
    videoTrack.enabled = newEnabled;

    if (this.room) {
      this.room.localParticipant.setCameraEnabled(newEnabled);
    }
    return newEnabled;
  }

  // Switch between front and rear cameras (mobile & responsive devices)
  async flipCamera(): Promise<'user' | 'environment'> {
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      const newConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { exact: this.currentFacingMode },
          width: { ideal: 1280, max: 1920, min: 640 },
          height: { ideal: 720, max: 1080, min: 360 },
          aspectRatio: { ideal: 16 / 9 },
          frameRate: { ideal: 30, max: 30, min: 24 },
        },
      };

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(newConstraints);
      } catch {
        // Fallback without exact facingMode
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: this.currentFacingMode },
            width: { ideal: 1280, max: 1920, min: 640 },
            height: { ideal: 720, max: 1080, min: 360 },
            aspectRatio: { ideal: 16 / 9 },
            frameRate: { ideal: 30, max: 30, min: 24 },
          },
        });
      }

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack && this.localStream) {
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          this.localStream.removeTrack(oldVideoTrack);
        }
        this.localStream.addTrack(newVideoTrack);

        // Update PeerConnection sender if in mesh mode
        if (this.peerConnection) {
          const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(newVideoTrack);
        }

        this.callbacks.onLocalStreamAvailable?.(this.localStream);
      }
    } catch (e) {
      console.warn('Flip camera failed:', e);
    }

    return this.currentFacingMode;
  }

  // Switch audio output to speaker where supported (e.g. Chrome, Android Chrome)
  async setAudioOutputDevice(mediaElement: HTMLMediaElement, deviceId: string): Promise<boolean> {
    if (typeof (mediaElement as any).setSinkId === 'function') {
      try {
        await (mediaElement as any).setSinkId(deviceId);
        return true;
      } catch (err) {
        console.warn('Unable to change audio output device:', err);
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // 7. ACTIVE SPEAKER ANALYSIS (Web Audio API Analyser)
  // ---------------------------------------------------------------------------
  private setupLocalAudioAnalyser(stream: MediaStream) {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      this.audioAnalyserNode = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!this.audioAnalyserNode) return;
        this.audioAnalyserNode.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // If average volume exceeds speaking threshold (> 25)
        const isSpeaking = average > 25 && audioTrack.enabled;
        if (isSpeaking && this.currentUserId) {
          this.callbacks.onActiveSpeakersChanged?.([this.currentUserId]);
        }

        this.analyserAnimationId = window.requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // 8. TEARDOWN & DISCONNECT
  // ---------------------------------------------------------------------------
  async disconnect(): Promise<void> {
    this.setConnectionState('disconnected');

    if (this.analyserAnimationId) {
      window.cancelAnimationFrame(this.analyserAnimationId);
      this.analyserAnimationId = null;
    }

    // Stop all local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      this.localStream = null;
    }

    // Disconnect LiveKit room
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch {}
      this.room = null;
    }

    // Clean up all remote streams
    this.remoteStreams.forEach(stream => {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
    });
    this.remoteStreams.clear();

    // Close PeerConnection & Signaling
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }

    if (this.signalingChannel) {
      try {
        await CallService.disconnect(this.signalingChannel);
      } catch {}
      this.signalingChannel = null;
    }
  }

  getRemoteStream(participantId?: string): MediaStream | null {
    if (participantId) {
      return this.remoteStreams.get(participantId) || null;
    }
    const first = this.remoteStreams.values().next();
    return first.value || null;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getConnectionState(): CallConnectionState {
    return this.connectionState;
  }
}
