import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CallSignalingService } from '../../services/callSignalingService';
import { useCall } from '../../context/CallContext';
import { Phone, PhoneOff, Video } from 'lucide-react';

export const IncomingCallModal: React.FC = () => {
  const { incomingSession, acceptIncomingCall, declineIncomingCall } = useCall();
  const { currentUser } = useAuth();
  const [isBlocking, setIsBlocking] = useState(false);

  if (!incomingSession) return null;

  const isVideo = incomingSession.call_type === 'video';

  const handleBlockCaller = async () => {
    if (!currentUser?.id || isBlocking) return;
    setIsBlocking(true);
    try {
      await CallSignalingService.blockUser(
        currentUser.id,
        incomingSession.caller_id,
        'Blocked from incoming call',
        incomingSession.caller_name
      );
      await declineIncomingCall();
    } catch (error: any) {
      alert(error?.message || 'Unable to block this caller. Please try again.');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#142B4A] border border-white/10 p-8 shadow-2xl text-center text-white overflow-hidden">
        {/* Glow backdrop pulse */}
        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-[#C6A45A]/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />

        {/* Call Type Header */}
        <div className="relative z-10 flex items-center justify-center gap-1.5 text-xs font-bold text-[#C6A45A] uppercase tracking-wider mb-6">
          {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          <span>Incoming FNI {isVideo ? 'Video' : 'Voice'} Call</span>
        </div>

        {/* Caller Avatar with Animated Ring Pulse */}
        <div className="relative z-10 mx-auto w-28 h-28 mb-6">
          <div className="absolute inset-0 rounded-full bg-[#C6A45A]/30 animate-ping" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[#142B4A] to-[#203D63] border-4 border-[#C6A45A] shadow-xl flex items-center justify-center overflow-hidden">
            {incomingSession.caller_avatar ? (
              <img
                src={incomingSession.caller_avatar}
                alt={incomingSession.caller_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-black text-white">
                {incomingSession.caller_name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 border-2 border-[#142B4A] text-white shadow-md">
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </div>
        </div>

        {/* Caller Details */}
        <div className="relative z-10 space-y-1 mb-8">
          <h2 className="text-xl font-black text-white tracking-tight">
            {incomingSession.caller_name}
          </h2>
          {incomingSession.caller_cell && (
            <p className="text-xs text-slate-300 font-medium">
              {incomingSession.caller_cell}
            </p>
          )}
          <p className="text-[11px] text-[#C6A45A] font-semibold animate-pulse pt-1">
            Ringing...
          </p>
        </div>

        {/* Action Buttons: Accept & Decline */}
        <div className="relative z-10 flex items-center justify-center gap-8">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={declineIncomingCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Decline Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-bold text-slate-400">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={acceptIncomingCall}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-emerald-500/30 animate-bounce"
              title="Accept Call"
            >
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </button>
            <span className="text-[11px] font-bold text-emerald-400">Accept</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleBlockCaller}
          disabled={isBlocking}
          className="relative z-10 mt-6 text-xs font-semibold text-slate-300 hover:text-rose-300 disabled:opacity-50 transition-colors"
        >
          {isBlocking ? 'Blocking caller…' : 'Block caller'}
        </button>
      </div>
    </div>
  );
};
