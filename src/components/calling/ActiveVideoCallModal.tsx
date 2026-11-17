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
  Maximize2,
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

  // Attach remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Attach local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
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
    if (remoteVideoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await remoteVideoRef.current.requestPictureInPicture();
        }
      } catch (e) {
        console.warn('PiP error:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-9990 flex items-center justify-center bg-black animate-fadeIn select-none">
      {/* Remote Video Stream (Full Container) */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-black text-white border-2 border-white/20">
              {peerName.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-semibold animate-pulse">
              {connectionState === 'connecting' || connectionState === 'initiating'
                ? 'Connecting video stream...'
                : 'Waiting for remote video...'}
            </p>
          </div>
        )}

        {/* Local Stream (Picture-in-Picture floating preview) */}
        <div className="absolute top-4 right-4 z-20 w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden bg-slate-900 border-2 border-white/30 shadow-2xl">
          {isVideoEnabled && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs">
              <VideoOff className="w-5 h-5 mb-1" />
              <span>Camera Off</span>
            </div>
          )}
        </div>

        {/* Top Floating Header */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-black/40 backdrop-blur-md py-2 px-4 rounded-full text-white border border-white/10">
          <div>
            <h3 className="text-xs font-bold">{peerName}</h3>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">
              {formatTime(callDuration)}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/20" />

          {/* Picture in Picture Button */}
          <button
            type="button"
            onClick={handleTogglePiP}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-slate-300 hover:text-white"
            title="Picture in Picture"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setIsCallMinimized(true)}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-slate-300 hover:text-white"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Control Dock */}
        <div className="absolute bottom-6 z-20 flex items-center justify-center gap-4 bg-black/50 backdrop-blur-lg px-6 py-3 rounded-full border border-white/15 shadow-2xl">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={() => toggleMicrophone()}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-rose-500 text-white ring-4 ring-rose-500/30'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera */}
          <button
            type="button"
            onClick={() => toggleCamera()}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              !isVideoEnabled
                ? 'bg-rose-500 text-white ring-4 ring-rose-500/30'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
            title={isVideoEnabled ? 'Disable Camera' : 'Enable Camera'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Flip Camera (Front / Back) */}
          <button
            type="button"
            onClick={() => flipCamera()}
            className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all"
            title="Switch Front/Rear Camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all ring-4 ring-rose-600/30 ml-2"
            title="End Video Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
