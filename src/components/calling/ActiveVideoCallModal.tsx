import React, { useRef, useEffect, useState } from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  RotateCcw,
  X,
  ChevronLeft,
  Pin,
  MessageSquare,
  Signal,
  Send,
  ExternalLink,
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

  const { currentUser } = useAuth();

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFillScreen, setIsFillScreen] = useState(true);
  const [isInCallChatOpen, setIsInCallChatOpen] = useState(false);
  const [quickMessageText, setQuickMessageText] = useState('');
  const [quickMessagesList, setQuickMessagesList] = useState<Array<{ id: string; sender: string; text: string; time: string }>>([
    {
      id: 'welcome',
      sender: 'System',
      text: 'Encrypted peer-to-peer ministerial video call connected.',
      time: 'Now',
    },
  ]);

  const autoHideTimeoutRef = useRef<number | null>(null);

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

  // Auto-hide controls after inactivity
  useEffect(() => {
    const resetAutoHideTimer = () => {
      if (autoHideTimeoutRef.current) {
        window.clearTimeout(autoHideTimeoutRef.current);
      }
      if (!isInCallChatOpen) {
        autoHideTimeoutRef.current = window.setTimeout(() => {
          setControlsVisible(false);
        }, 5000);
      }
    };

    if (controlsVisible) {
      resetAutoHideTimer();
    }

    return () => {
      if (autoHideTimeoutRef.current) {
        window.clearTimeout(autoHideTimeoutRef.current);
      }
    };
  }, [controlsVisible, isInCallChatOpen]);

  if (!activeSession || activeSession.call_type !== 'video' || activeSession.call_mode !== 'direct') {
    return null;
  }

  const peerName = activeSession.receiver_name || activeSession.caller_name || 'FNI Member';
  const myName = currentUser?.full_name || 'You';
  const myShortName = myName.split(' ')[0] || 'Me';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleScreenTap = (e: React.MouseEvent) => {
    // Prevent toggling when clicking controls
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.interactive-control')) {
      return;
    }
    setControlsVisible(prev => !prev);
  };

  const handleSendQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMessageText.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: myShortName,
      text: quickMessageText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setQuickMessagesList(prev => [...prev, newMsg]);
    setQuickMessageText('');
  };

  return (
    <div
      onClick={handleScreenTap}
      className="fixed inset-0 z-9990 flex flex-col justify-between bg-black animate-fadeIn select-none overflow-hidden touch-manipulation"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
      }}
    >
      {/* ── 1. BACKGROUND REMOTE VIDEO (FULL VIEWPORT) ── */}
      <div className="absolute inset-0 w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full ${isFillScreen ? 'object-cover' : 'object-contain'}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-slate-300 p-6 text-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#142B4A] to-[#203D63] border-4 border-[#C6A45A]/40 flex items-center justify-center text-3xl font-black text-white shadow-2xl">
                {peerName.slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute -inset-2 rounded-full border-2 border-sky-400 animate-ping opacity-40 pointer-events-none" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{peerName}</h2>
              <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md">
                <Signal className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>
                  {connectionState === 'connecting' || connectionState === 'initiating'
                    ? 'Establishing secure video link...'
                    : connectionState === 'reconnecting'
                    ? 'Reconnecting video stream...'
                    : 'Video connected • Waiting for remote camera'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. TOP FLOATING BAR (TELEGRAM STYLE: < Back & Pin & Status) ── */}
      <div
        className={`relative z-30 flex items-center justify-between px-4 sm:px-6 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: < Back Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCallMinimized(true);
          }}
          className="interactive-control inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white text-sm font-semibold transition-all active:scale-95 cursor-pointer shadow-lg"
          title="Minimize call and return to portal"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
          <span>Back</span>
        </button>

        {/* Center: Live Call Timer */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-mono font-bold text-white shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{formatTime(callDuration)}</span>
        </div>

        {/* Right: Pin / Aspect Ratio Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFillScreen(prev => !prev);
          }}
          className={`interactive-control p-2 rounded-full backdrop-blur-md border transition-all active:scale-95 cursor-pointer shadow-lg ${
            isFillScreen
              ? 'bg-black/40 hover:bg-black/60 border-white/10 text-white'
              : 'bg-sky-500 text-white border-sky-400'
          }`}
          title={isFillScreen ? 'Switch to Fit screen (letterbox)' : 'Switch to Fill screen'}
        >
          <Pin className="w-4 h-4" />
        </button>
      </div>

      {/* ── 3. LOWER SECTION: REMOTE NAME BADGE + LOCAL PiP PREVIEW (BOTTOM-LEFT) ── */}
      <div className="relative z-20 px-4 sm:px-6 mt-auto flex flex-col items-start gap-2 pointer-events-none">
        {/* Remote Participant Badge (Placed right above the PiP window as in Telegram) */}
        <div
          className={`interactive-control pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white shadow-xl transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Mute indicator */}
          <MicOff className="w-3.5 h-3.5 text-white/80 shrink-0" />
          <span className="text-xs font-bold tracking-tight">{peerName}</span>
          <span className="text-xs" title="FNI Fellowship Minister">🕎</span>
        </div>

        {/* Local Picture-in-Picture Preview Window (Bottom-Left with Distinct Blue Outline) */}
        <div
          className="interactive-control pointer-events-auto relative w-24 sm:w-32 aspect-3/4 rounded-2xl overflow-hidden bg-slate-900 border-2 border-sky-400 shadow-2xl shadow-sky-950/50 transition-transform active:scale-95 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            // Flip camera when tapping preview or toggle state
            flipCamera();
          }}
          title="Your preview • Tap to flip camera"
        >
          {isVideoEnabled && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs p-2 text-center">
              <VideoOff className="w-5 h-5 mb-1 text-slate-500" />
              <span className="text-[10px] font-semibold">Camera Off</span>
            </div>
          )}

          {/* Local Name Badge Inside PiP Window at the bottom */}
          <div className="absolute inset-x-0 bottom-0 py-1 px-1.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between text-white">
            <span className="text-[10px] font-bold truncate max-w-[55px]">
              {myShortName}...
            </span>
            {isMuted ? (
              <MicOff className="w-3 h-3 text-rose-400 shrink-0" />
            ) : (
              <Mic className="w-3 h-3 text-sky-400 shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM FLOATING CIRCULAR CONTROL DOCK (TELEGRAM STYLE) ── */}
      <div
        className={`relative z-30 pt-3 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 max-w-md mx-auto">
          {/* Button 1: Switch / Flip Camera */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              flipCamera();
            }}
            className="interactive-control w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg"
            title="Flip front / rear camera"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Button 2: Camera Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCamera();
            }}
            className={`interactive-control w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg ${
              isVideoEnabled
                ? 'bg-blue-600/90 hover:bg-blue-600 text-white border border-blue-400/30'
                : 'bg-white/15 hover:bg-white/25 text-white/70 border border-white/20'
            }`}
            title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Button 3: HERO Microphone Toggle (Center Prominent Blue Button) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMicrophone();
            }}
            className={`interactive-control w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xl ${
              !isMuted
                ? 'bg-sky-500 hover:bg-sky-400 text-white ring-4 ring-sky-500/30 shadow-sky-500/50'
                : 'bg-white/20 hover:bg-white/30 text-white ring-4 ring-white/15'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>

          {/* Button 4: In-Call Chat / Messages */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsInCallChatOpen(prev => !prev);
            }}
            className={`interactive-control w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg ${
              isInCallChatOpen
                ? 'bg-sky-500 text-white border border-sky-400'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
            title="In-call chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Button 5: End Call (Telegram style with red accent / X icon) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              endCall();
            }}
            className="interactive-control w-12 h-12 rounded-full bg-rose-900/80 hover:bg-rose-600 active:bg-rose-700 backdrop-blur-md border border-rose-500/40 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg shadow-rose-950/60"
            title="End video call"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ── 5. IN-CALL QUICK CHAT SLIDE-UP DRAWER ── */}
      {isInCallChatOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="interactive-control absolute inset-x-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl max-h-[60vh] flex flex-col shadow-2xl animate-slideUp overflow-hidden"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2 text-white">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold">In-Call Messages ({peerName})</h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCallMinimized(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold px-2 py-1 rounded-lg hover:bg-white/5"
                title="Open complete messenger"
              >
                <span>Full Chat</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setIsInCallChatOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                title="Close chat drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-[140px] max-h-[220px]">
            {quickMessagesList.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col text-xs ${
                  msg.sender === myShortName ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] text-left ${
                    msg.sender === myShortName
                      ? 'bg-sky-600 text-white rounded-br-xs'
                      : 'bg-white/10 text-white rounded-bl-xs'
                  }`}
                >
                  <div className="text-[10px] font-bold opacity-75 mb-0.5">{msg.sender}</div>
                  <p className="leading-snug">{msg.text}</p>
                  <span className="text-[9px] opacity-60 mt-1 block text-right">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Message Input */}
          <form onSubmit={handleSendQuickMessage} className="px-4 py-2 border-t border-white/10 flex items-center gap-2 bg-black/30">
            <input
              type="text"
              value={quickMessageText}
              onChange={(e) => setQuickMessageText(e.target.value)}
              placeholder="Send quick in-call message..."
              className="flex-1 px-3 py-2 rounded-full bg-white/10 border border-white/15 text-white placeholder-white/40 text-xs focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              disabled={!quickMessageText.trim()}
              className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
