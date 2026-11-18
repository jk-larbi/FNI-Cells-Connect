import React, { useRef, useEffect } from 'react';
import { useCall } from '../../context/CallContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  PhoneOff,
  Minimize2,
  Tv,
} from 'lucide-react';

export const ActiveVideoCallModal: React.FC = () => {
  const {
    activeSession,
    connectionState,
    callDuration,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    toggleMicrophone,
    toggleCamera,
    flipCamera,
    endCall,
    setIsCallMinimized,
  } = useCall();

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    video.srcObject = remoteStream || null;
    if (remoteStream) void video.play().catch(() => undefined);
    return () => { video.srcObject = null; };
  }, [remoteStream]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    video.srcObject = localStream || null;
    if (localStream) void video.play().catch(() => undefined);
    return () => { video.srcObject = null; };
  }, [localStream]);

  if (!activeSession || activeSession.call_type !== 'video' || activeSession.call_mode !== 'direct') {
    return null;
  }

  const peerName = activeSession.receiver_name || activeSession.caller_name || 'FNI Member';
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTogglePiP = async () => {
    const video = remoteVideoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch (error) {
      console.warn('Picture-in-picture is unavailable:', error);
    }
  };

  const connectionLabel =
    connectionState === 'connected' ? 'Connected' :
    connectionState === 'connecting' || connectionState === 'initiating' ? 'Connecting…' :
    'Reconnecting…';

  return (
    <div className="fixed inset-0 z-[9990] h-[100dvh] w-full overflow-hidden bg-black text-white animate-fadeIn select-none">
      <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-slate-950">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-contain"
            aria-label={`Video call with ${peerName}`}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center text-slate-300">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/20 bg-slate-800 text-3xl font-black">
              {peerName.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-semibold">{connectionLabel}</p>
            <p className="text-xs text-slate-400">Waiting for the other camera…</p>
          </div>
        )}

        {/* Header respects the iPhone/Android status-bar safe area. */}
        <div className="absolute left-3 right-3 top-[max(.75rem,env(safe-area-inset-top))] z-30 flex items-start justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto flex min-w-0 max-w-[58%] items-center gap-3 rounded-2xl border border-white/10 bg-black/65 px-3 py-2.5 shadow-lg backdrop-blur-md">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">{peerName}</h3>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-mono font-semibold text-emerald-300">{formatTime(callDuration)}</span>
                <span className="text-white/55">•</span>
                <span className="truncate text-white/75">{connectionLabel}</span>
              </div>
            </div>
            <button type="button" onClick={handleTogglePiP} aria-label="Picture in picture" title="Picture in picture" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <Tv className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setIsCallMinimized(true)} aria-label="Minimize call" title="Minimize call" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>

          <div className="pointer-events-auto w-[clamp(6.25rem,28vw,11rem)] shrink-0 overflow-hidden rounded-2xl border-2 border-white/40 bg-slate-900 shadow-2xl">
            <div className="aspect-video w-full">
              {isVideoEnabled && localStream ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover -scale-x-100" aria-label="Your camera preview" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-800 text-[10px] text-slate-300">
                  <VideoOff className="h-5 w-5" />
                  Camera off
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed, thumb-reachable controls never depend on hover and stay above the home indicator. */}
        <div className="absolute bottom-[max(.75rem,env(safe-area-inset-bottom))] left-2 right-2 z-40 flex items-center justify-center gap-2 sm:gap-4">
          <div className="flex max-w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-black/75 px-2 py-2 shadow-2xl backdrop-blur-xl sm:gap-4 sm:px-5 sm:py-3">
            <button type="button" onClick={() => void toggleMicrophone()} aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'} title={isMuted ? 'Unmute microphone' : 'Mute microphone'} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors sm:h-14 sm:w-14 ${isMuted ? 'bg-rose-600 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}>
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button type="button" onClick={() => void toggleCamera()} aria-label={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'} title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors sm:h-14 sm:w-14 ${!isVideoEnabled ? 'bg-rose-600 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}>
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <button type="button" onClick={() => void flipCamera()} aria-label="Switch front and rear camera" title="Switch front and rear camera" disabled={!isVideoEnabled || !localStream} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40 sm:h-14 sm:w-14">
              <SwitchCamera className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => void endCall()} aria-label="End video call" title="End video call" className="ml-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg ring-4 ring-rose-600/25 transition-transform active:scale-95 hover:bg-rose-700 sm:h-16 sm:w-16">
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
