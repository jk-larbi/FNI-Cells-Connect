import React, { useRef, useEffect } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  PhoneOff,
  Users,
  ShieldCheck,
  Minimize2,
  UserX,
  Volume2,
} from 'lucide-react';

export const GroupMeetingModal: React.FC = () => {
  const {
    activeSession,
    connectionState,
    callDuration,
    localStream,
    remoteParticipants,
    isMuted,
    isVideoEnabled,
    activeSpeakers,
    toggleMicrophone,
    toggleCamera,
    flipCamera,
    endCall,
    setIsCallMinimized,
  } = useCall();
  const { currentUser } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (!activeSession || (activeSession.call_mode !== 'group' && activeSession.call_mode !== 'cell')) {
    return null;
  }

  const isHost = activeSession.caller_id === currentUser?.id;
  const isVideo = activeSession.call_type === 'video';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalParticipantsCount = remoteParticipants.length + 1; // +1 for self

  return (
    <div
      className="fixed inset-0 w-screen h-screen h-[100dvh] z-[99999] flex flex-col justify-between bg-slate-950 animate-fadeIn select-none p-0 border-0 rounded-none overflow-hidden m-0"
    >
      <div className="relative w-full h-full flex flex-col justify-between bg-[#0f172a] border-0 rounded-none overflow-hidden">
        {/* Top Header */}
        <div
          className="flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-md border-b border-white/10 z-10"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#142B4A] to-[#203D63] border border-[#C6A45A]/30 flex items-center justify-center text-[#C6A45A]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{activeSession.room_title || 'FNI Meeting'}</span>
                {isHost && (
                  <span className="text-[10px] bg-[#C6A45A]/20 text-[#C6A45A] font-bold px-2 py-0.5 rounded-full border border-[#C6A45A]/30">
                    Host
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-mono font-bold">
                  {formatTime(callDuration)}
                </span>
                <span>•</span>
                <span>{totalParticipantsCount} connected</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCallMinimized(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Minimize meeting"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Participant Grid */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex items-center justify-center">
          <div
            className={`w-full h-full grid gap-4 ${
              totalParticipantsCount === 1
                ? 'grid-cols-1 max-w-xl'
                : totalParticipantsCount === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : totalParticipantsCount <= 4
                ? 'grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3'
            }`}
          >
            {/* Self Tile */}
            <div
              className={`relative rounded-2xl bg-slate-900 border-2 overflow-hidden flex items-center justify-center shadow-lg transition-all ${
                activeSpeakers.includes(currentUser?.id || '')
                  ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                  : 'border-white/10'
              }`}
            >
              {isVideo && isVideoEnabled && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <div className="w-20 h-20 rounded-full bg-[#142B4A] border-2 border-[#C6A45A] flex items-center justify-center text-2xl font-black text-white">
                    {currentUser?.full_name ? currentUser.full_name.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                  <span className="text-xs font-bold">You (Host)</span>
                </div>
              )}

              {/* Status indicators */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-semibold">
                <span>You</span>
                {isMuted && <MicOff className="w-3 h-3 text-rose-400 ml-1" />}
              </div>
            </div>

            {/* Remote Participants */}
            {remoteParticipants.map(participant => {
              const isSpeaking = activeSpeakers.includes(participant.id);

              return (
                <div
                  key={participant.id}
                  className={`relative rounded-2xl bg-slate-900 border-2 overflow-hidden flex items-center justify-center shadow-lg transition-all ${
                    isSpeaking ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/10'
                  }`}
                >
                  {participant.stream && participant.stream.getVideoTracks().length > 0 ? (
                    <video
                      autoPlay
                      playsInline
                      ref={el => {
                        if (el && participant.stream) el.srcObject = participant.stream;
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-white/20 flex items-center justify-center text-2xl font-black text-white">
                        {participant.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold">{participant.name}</span>
                    </div>
                  )}

                  {/* Remote Badge */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-semibold">
                    <span>{participant.name}</span>
                    {isSpeaking && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Meeting Controls */}
        <div
          className="flex items-center justify-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-900/90 backdrop-blur-md border-t border-white/10 z-10 shrink-0"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          {/* Mute Mic */}
          <button
            type="button"
            onClick={() => toggleMicrophone()}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-rose-500 text-white ring-4 ring-rose-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video (if video meeting) */}
          {isVideo && (
            <>
              <button
                type="button"
                onClick={() => toggleCamera()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  !isVideoEnabled
                    ? 'bg-rose-500 text-white ring-4 ring-rose-500/30'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => flipCamera()}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                title="Flip Camera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Leave / End Meeting Button */}
          <button
            type="button"
            onClick={endCall}
            className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all ring-4 ring-rose-600/30"
          >
            <PhoneOff className="w-4 h-4" />
            <span>{isHost ? 'End Meeting for All' : 'Leave Meeting'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
