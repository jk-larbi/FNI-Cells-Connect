import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessagingService } from '../../services/messagingService';
import { CellService } from '../../services/cellService';
import { PrivateMessage, CommunityMessage, InvitationCode, Cell } from '../../types';
import {
  MessageSquare,
  Users,
  Send,
  Lock,
  KeyRound,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button';

export interface MessagingViewProps {
  initialConversationId?: string;
  initialTab?: 'private' | 'community';
}

export const MessagingView: React.FC<MessagingViewProps> = ({
  initialConversationId,
  initialTab,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'private' | 'community'>(() => initialTab || 'private');

  // Private Messaging State
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateText, setPrivateText] = useState('');
  const [selectedTutorId, setSelectedTutorId] = useState<string>(() => initialConversationId || '');
  const [tutorList, setTutorList] = useState<{ id: string; name: string; cellName: string }[]>([]);
  const [isSendingPrivate, setIsSendingPrivate] = useState(false);

  // Community Messaging State
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [communityText, setCommunityText] = useState('');
  const [communityCategory, setCommunityCategory] = useState<'general' | 'announcement' | 'prayer_request' | 'testimony'>('general');
  const [hasJoinedCommunity, setHasJoinedCommunity] = useState<boolean>(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSendingCommunity, setIsSendingCommunity] = useState(false);

  // Admin Invite Code Generator Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [maxUses, setMaxUses] = useState(10);
  const [generatedCodes, setGeneratedCodes] = useState<InvitationCode[]>([]);
  const [newCodeSuccess, setNewCodeSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (isAdmin) {
        // Load all cells and tutors
        const cells = await CellService.getCells();
        const tList = cells.map(c => ({
          id: c.tutorUid || c.leader_name || c.id,
          name: c.leader_name || 'Tutor',
          cellName: c.name,
        }));
        setTutorList(tList);
        if (tList.length > 0 && !selectedTutorId) {
          setSelectedTutorId(tList[0].id);
        }
        setHasJoinedCommunity(true);
      } else {
        const joined = MessagingService.checkCommunityAccess(currentUser.id, currentUser.role);
        setHasJoinedCommunity(joined);
      }
      loadCommunity();
      if (isAdmin) {
        loadInviteCodes();
      }
    }
    init();
  }, [currentUser, isAdmin]);

  // Load private messages whenever target changes
  useEffect(() => {
    loadPrivateMessages();
  }, [currentUser, isAdmin, selectedTutorId]);

  const loadPrivateMessages = async () => {
    const tutorId = isAdmin ? selectedTutorId : currentUser.id;
    if (!tutorId) return;
    const msgs = await MessagingService.getPrivateConversation(tutorId);
    setPrivateMessages(msgs);
    await MessagingService.markPrivateMessagesRead(tutorId, currentUser.id);
  };

  const loadCommunity = async () => {
    const msgs = await MessagingService.getCommunityMessages();
    setCommunityMessages(msgs);
  };

  const loadInviteCodes = async () => {
    const codes = await MessagingService.getInvitationCodes();
    setGeneratedCodes(codes);
  };

  const handleSendPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateText.trim()) return;

    const targetTutorId = isAdmin ? selectedTutorId : currentUser.id;
    const targetTutorName = isAdmin
      ? tutorList.find(t => t.id === selectedTutorId)?.name || 'Tutor'
      : currentUser.full_name;

    setIsSendingPrivate(true);
    try {
      await MessagingService.sendPrivateMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name,
        senderRole: currentUser.role,
        recipientUid: isAdmin ? targetTutorId : 'admin',
        recipientName: isAdmin ? targetTutorName : 'Administrator / Leadership',
        cellId: currentUser.cell_id,
        cellName: currentUser.cell_name,
        content: privateText.trim(),
      });
      setPrivateText('');
      await loadPrivateMessages();
    } finally {
      setIsSendingPrivate(false);
    }
  };

  const handleJoinCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!inviteCodeInput.trim()) return;

    const res = await MessagingService.validateAndRedeemInvitationCode(inviteCodeInput.trim(), currentUser.id);
    if (!res.valid) {
      setInviteError(res.error || 'Invalid or expired invitation code. Please request a new code from leadership.');
      return;
    }

    setHasJoinedCommunity(true);
    setInviteCodeInput('');
  };

  const handleSendCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityText.trim()) return;

    setIsSendingCommunity(true);
    try {
      await MessagingService.sendCommunityMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name,
        senderRole: currentUser.role,
        cellName: currentUser.cell_name,
        content: communityText.trim(),
        category: communityCategory,
      });
      setCommunityText('');
      await loadCommunity();
    } finally {
      setIsSendingCommunity(false);
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = await MessagingService.generateInvitationCode(
      currentUser.id,
      currentUser.full_name,
      expiryMinutes,
      maxUses
    );
    setNewCodeSuccess(code.code);
    await loadInviteCodes();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-navy-50 text-navy-900 border border-navy-200 mb-1">
            <Lock className="w-3 h-3 text-gold-500" />
            Confidential & Fellowship Communications
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-950 tracking-tight">
            FNI Communications Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Two strictly isolated channels: 1-on-1 confidential leadership line & authenticated tutor community forum.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('private')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'private'
                ? 'bg-navy-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-navy-950'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-gold-400" />
            <span>Private Pastoral Line</span>
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'community'
                ? 'bg-navy-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-navy-950'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-gold-400" />
            <span>Tutor Community Forum</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PRIVATE MESSAGING */}
      {activeTab === 'private' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-navy-950 text-white border-b border-navy-900 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {isAdmin
                    ? 'Confidential Pastoral Oversight Line'
                    : 'Confidential Leadership Line (Tutor ↔ Administrator)'}
                </h3>
                <p className="text-[11px] text-slate-300">
                  {isAdmin
                    ? 'Select a tutor to inspect their private communication channel'
                    : 'Direct, encrypted communication with ministry leadership. Never shared publicly.'}
                </p>
              </div>
            </div>

            {isAdmin && tutorList.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">Select Tutor:</span>
                <select
                  value={selectedTutorId}
                  onChange={e => setSelectedTutorId(e.target.value)}
                  className="bg-navy-900 border border-navy-700 text-white text-xs rounded-xl px-3 py-1.5 font-semibold focus:outline-none"
                >
                  {tutorList.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.cellName})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div className="p-6 h-[420px] overflow-y-auto space-y-4 bg-slate-50/50">
            {privateMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <Lock className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No private messages yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mt-1">
                  Start a confidential discussion regarding cell leadership, discipleship guidance, or pastoral support.
                </p>
              </div>
            ) : (
              privateMessages.map(msg => {
                const isMine = msg.senderUid === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-bold text-navy-950">
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({msg.senderRole === 'admin' ? 'Leadership' : 'Tutor'})
                      </span>
                    </div>

                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isMine
                          ? 'bg-navy-950 text-white rounded-tr-none shadow-sm'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.content}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-400">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && (
                        msg.isRead ? (
                          <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-sky-500" /></span>
                        ) : (
                          <span title="Sent"><Check className="w-3.5 h-3.5 text-slate-400" /></span>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendPrivate} className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={privateText}
              onChange={e => setPrivateText(e.target.value)}
              placeholder="Type your confidential message to leadership..."
              className="flex-1 text-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:outline-none"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSendingPrivate}
              leftIcon={<Send className="w-4 h-4 text-gold-400" />}
              className="rounded-xl px-5"
            >
              Send Message
            </Button>
          </form>
        </div>
      )}

      {/* TAB 2: TUTOR COMMUNITY FORUM */}
      {activeTab === 'community' && (
        <div className="space-y-4">
          {!hasJoinedCommunity && !isAdmin ? (
            /* Invite Code Access Gate */
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-gold-50 text-gold-600 border border-gold-200 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-navy-950">Tutor Community Access Required</h2>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                The Tutor Community is a restricted forum for verified cell tutors. Enter the invitation code provided by FNI leadership to join.
              </p>

              {inviteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs mb-4 flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              <form onSubmit={handleJoinCommunity} className="space-y-3">
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. FNI-COMM-XXXX"
                  className="w-full text-center tracking-widest text-sm font-mono font-bold uppercase rounded-xl border border-slate-200 bg-slate-50 p-3 focus:bg-white focus:ring-2 focus:ring-navy-600 focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full rounded-xl py-3"
                >
                  Join Tutor Community
                </Button>
              </form>
            </div>
          ) : (
            /* Community Stream */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
              {/* Forum Header */}
              <div className="p-5 bg-navy-950 text-white border-b border-navy-900 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-400 uppercase tracking-wider mb-0.5">
                    <Sparkles className="w-3 h-3" /> FNI Fellowship Exchange
                  </div>
                  <h3 className="font-bold text-base text-white">Tutor Community & Best Practices</h3>
                  <p className="text-xs text-slate-300">
                    A collaborative space for prayer requests, evangelism reports, testimonies, and mutual encouragement.
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowInviteModal(true);
                      setNewCodeSuccess(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30 text-xs font-bold hover:bg-gold-500/30 transition-all flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Generate Invite Code</span>
                  </button>
                )}
              </div>

              {/* Forum Stream */}
              <div className="p-6 h-[460px] overflow-y-auto space-y-4 bg-slate-50/50">
                {communityMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                    <Users className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-600">The community board is fresh</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mt-1">
                      Share an encouraging word, prayer need, or testimony with fellow tutors across all campuses.
                    </p>
                  </div>
                ) : (
                  communityMessages.map(msg => (
                    <div key={msg.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-navy-900 text-gold-400 font-bold text-xs flex items-center justify-center">
                            {msg.senderName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-navy-950">{msg.senderName}</span>
                            <span className="text-[11px] text-slate-500 ml-1.5">
                              • {msg.cellName || 'FNI Ministry'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            msg.category === 'announcement'
                              ? 'bg-amber-100 text-amber-800'
                              : msg.category === 'prayer_request'
                              ? 'bg-purple-100 text-purple-800'
                              : msg.category === 'testimony'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {(msg.category || 'general').replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed pl-10">
                        {msg.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Compose Bar */}
              <form onSubmit={handleSendCommunity} className="p-4 bg-white border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Post Category:</span>
                  {(['general', 'announcement', 'prayer_request', 'testimony'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCommunityCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        communityCategory === cat
                          ? 'bg-navy-950 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat === 'general' ? 'General' : cat === 'announcement' ? 'Announcement' : cat === 'prayer_request' ? 'Prayer Request' : 'Testimony'}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={communityText}
                    onChange={e => setCommunityText(e.target.value)}
                    placeholder="Share an announcement, prayer point or testimony with fellow tutors..."
                    className="flex-1 text-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:outline-none"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSendingCommunity}
                    leftIcon={<Send className="w-4 h-4 text-gold-400" />}
                    className="rounded-xl px-5"
                  >
                    Post to Forum
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Admin Invite Code Generator Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-gold-500" />
                    <h3 className="text-base font-bold text-navy-950">Community Invitation Code</h3>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="text-xs text-slate-400 hover:text-navy-950"
                  >
                    Close
                  </button>
                </div>

                {newCodeSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
                    <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Generated Code (Share with Tutors):
                    </div>
                    <div className="text-xl font-mono font-extrabold text-emerald-900 tracking-wider">
                      {newCodeSuccess}
                    </div>
                    <div className="text-[10px] text-emerald-700">
                      Valid for {expiryMinutes} minutes
                    </div>
                  </div>
                )}

                <form onSubmit={handleGenerateCode} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Expiry Duration (in Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={expiryMinutes}
                      onChange={e => setExpiryMinutes(parseInt(e.target.value) || 60)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Maximum Allowed Uses
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={maxUses}
                      onChange={e => setMaxUses(parseInt(e.target.value) || 10)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="rounded-xl px-4"
                    >
                      Generate New Code
                    </Button>
                  </div>
                </form>

                {generatedCodes.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600 block mb-2">Recent Codes</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {generatedCodes.map(c => {
                        const isExpired = new Date(c.expiresAt).getTime() < Date.now();
                        return (
                          <div key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-[11px]">
                            <span className="font-mono font-bold text-navy-950">{c.code}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isExpired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isExpired ? 'Expired' : `Uses: ${c.usedCount}/${c.maxUses}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
