import React from 'react';
import { useCall } from '../../context/CallContext';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Minimize2,
  ShieldCheck,
  Signal,
} from 'lucide-react';

export const ActiveVoiceCallModal: React.FC = () => {
  const {
    activeSession,
    connectionState,
    callDuration,
    isMuted,
    isSpeakerOn,
    activeSpeakers,
    toggleMicrophone,
    toggleSpeaker,
    endCall,
    setIsCallMinimized,
  } = useCall();

  if (!activeSession || activeSession.call_type !== 'voice') return null;

  const isRinging = connectionState === 'initiating' || connectionState === 'connecting';
  const peerName = activeSession.receiver_name || activeSession.caller_name || 'FNI Member';
  const peerAvatar = activeSession.receiver_avatar || activeSession.caller_avatar;
  const peerCell = activeSession.caller_cell || activeSession.receiver_name;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isPeerSpeaking = activeSpeakers.length > 0;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md animate-fadeIn"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
      }}
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[#142B4A] border border-white/10 p-6 sm:p-8 shadow-2xl text-center text-white flex flex-col justify-between max-h-[85vh] min-h-[420px]">
        {/* Header Bar */}
        <div className="flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4 text-[#C6A45A]" />
            <span className="text-[10px] tracking-wide uppercase">FNI Voice Link</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCallMinimized(true)}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
            title="Minimize call"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Avatar & Speaker Indicator */}
        <div className="my-auto py-6">
          <div className="relative mx-auto w-32 h-32 mb-5">
            {isPeerSpeaking && (
              <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
            )}
            <div
              className={`relative w-full h-full rounded-full bg-gradient-to-br from-[#142B4A] to-[#203D63] border-4 flex items-center justify-center overflow-hidden shadow-2xl transition-all ${
                isPeerSpeaking ? 'border-emerald-400 ring-4 ring-emerald-400/20' : 'border-[#C6A45A]'
              }`}
            >
              {peerAvatar ? (
                <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white">
                  {peerName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight mb-1">{peerName}</h2>
          {peerCell && <p className="text-xs text-slate-300 mb-2">{peerCell}</p>}

          {/* Connection / Timer Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-bold tracking-wider">
            {isRinging ? (
              <span className="text-[#C6A45A] animate-pulse">Ringing...</span>
            ) : connectionState === 'reconnecting' ? (
              <span className="text-amber-400 animate-pulse flex items-center gap-1">
                <Signal className="w-3 h-3" /> Reconnecting...
              </span>
            ) : (
              <span className="text-emerald-400">{formatTime(callDuration)}</span>
            )}
          </div>
        </div>

        {/* Bottom Control Dock */}
        <div className="flex items-center justify-center gap-5 pt-4 border-t border-white/10">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={() => toggleMicrophone()}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-rose-500 text-white ring-4 ring-rose-500/30'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all ring-4 ring-rose-600/30"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Toggle */}
          <button
            type="button"
            onClick={toggleSpeaker}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              !isSpeakerOn
                ? 'bg-amber-500 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isSpeakerOn ? 'Mute Speaker' : 'Turn On Speaker'}
          >
            {!isSpeakerOn ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
