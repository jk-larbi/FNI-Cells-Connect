import React from 'react';
import { useCall } from '../../context/CallContext';
import { IncomingCallModal } from './IncomingCallModal';
import { ActiveVoiceCallModal } from './ActiveVoiceCallModal';
import { ActiveVideoCallModal } from './ActiveVideoCallModal';
import { GroupMeetingModal } from './GroupMeetingModal';
import {
  Phone,
  Video,
  Mic,
  MicOff,
  Maximize2,
  PhoneOff,
} from 'lucide-react';

export const CallOverlay: React.FC = () => {
  const {
    activeSession,
    incomingSession,
    isCallMinimized,
    setIsCallMinimized,
    callDuration,
    isMuted,
    toggleMicrophone,
    endCall,
  } = useCall();

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 1. Incoming Call Screen */}
      {incomingSession && <IncomingCallModal />}

      {/* 2. Active Call Screens (Full View when not Minimized) */}
      {activeSession && !isCallMinimized && (
        <>
          {activeSession.call_mode === 'group' || activeSession.call_mode === 'cell' ? (
            <GroupMeetingModal />
          ) : activeSession.call_type === 'video' ? (
            <ActiveVideoCallModal />
          ) : (
            <ActiveVoiceCallModal />
          )}
        </>
      )}

      {/* 3. Floating Minimized Call Widget */}
      {activeSession && isCallMinimized && (
        <div className="fixed bottom-20 right-6 z-9999 flex items-center gap-3 bg-[#142B4A] text-white p-2.5 pl-4 rounded-full border border-white/20 shadow-2xl animate-bounce-short">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block" />
            </div>

            <div className="text-left">
              <p className="text-xs font-bold leading-none max-w-[120px] truncate">
                {activeSession.receiver_name || activeSession.caller_name || activeSession.room_title || 'FNI Call'}
              </p>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                {formatTime(callDuration)}
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-white/20" />

          {/* Quick Mute Toggle */}
          <button
            type="button"
            onClick={() => toggleMicrophone()}
            className={`p-2 rounded-full transition-colors ${
              isMuted ? 'bg-rose-500 text-white' : 'hover:bg-white/10 text-slate-300'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Maximize Back */}
          <button
            type="button"
            onClick={() => setIsCallMinimized(false)}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 transition-colors"
            title="Maximize call"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Quick End Call */}
          <button
            type="button"
            onClick={endCall}
            className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            title="End call"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
};
