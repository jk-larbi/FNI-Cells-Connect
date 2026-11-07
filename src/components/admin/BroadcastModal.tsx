import React, { useState } from 'react';
import { Cell } from '../../types';
import { X, Send, Share2, Mail, Copy, Check, MessageSquare } from 'lucide-react';
import { buildWhatsAppLink } from '../../lib/notifications';

interface BroadcastModalProps {
  cells: Cell[];
  onClose: () => void;
  onSend: (target: string, title: string, message: string) => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  cells,
  onClose,
  onSend
}) => {
  const [target, setTarget] = useState<string>('all');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const targetName = target === 'all'
    ? 'All Cell Leaders'
    : (cells.find(c => c.id === target)?.name || 'Selected Cell');

  const formattedWhatsAppBroadcast = `*FORERUNNERS NETWORK INTERNATIONAL (FNI)*\n` +
    `*OFFICIAL MINISTRY NOTICE*\n` +
    `To: ${targetName}\n` +
    `-----------------------------------\n` +
    (title ? `*${title.toUpperCase()}*\n\n` : '') +
    `${message}\n\n` +
    `_Sent by FNI Administrator_`;

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(formattedWhatsAppBroadcast);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`Subject: [FNI Notice] ${title || 'Notice from Administrator'}\n\n${message}`);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    onSend(target, title.trim() || 'Notice from Administrator', message.trim());
    setSentSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2447]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E3E6EB] rounded-lg max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#E3E6EB] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-[#B8923A]" />
            <h2 className="text-sm font-semibold text-[#0F2447] font-serif-title">
              Send Notice to Cell Leaders
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#5B6472] hover:text-[#0F2447] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center text-xs text-emerald-800 space-y-2">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-[#0F2447]">Announcement Dispatched</h3>
            <p className="text-[#5B6472]">In-app notifications have been logged for {targetName}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-medium text-[#14213D] mb-1">
                Recipients Target
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white text-[#14213D]"
              >
                <option value="all">All Registered Cell Leaders ({cells.length} cells)</option>
                {cells.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.leader} ({c.area})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#14213D] mb-1">
                Notice Title / Subject
              </label>
              <input
                type="text"
                placeholder="e.g. Monthly Cell Leaders Prayer Vigil"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white text-[#14213D]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#14213D] mb-1">
                Message Content <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Write official announcement, reporting deadline reminders, or spiritual charge..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2.5 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white text-[#14213D] resize-y"
              />
            </div>

            {/* Multi-Channel Fast Sharing Triggers */}
            <div className="p-3 bg-[#F6F7F9] rounded border border-[#E3E6EB] space-y-2">
              <span className="block font-semibold text-[#0F2447] text-[11px] uppercase tracking-wider">
                Multi-Channel Dispatch Options:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  disabled={!message.trim()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-white text-[#14213D] border border-[#E3E6EB] rounded hover:bg-slate-50 disabled:opacity-50"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{copiedWhatsApp ? 'Copied WhatsApp Text!' : 'Copy WhatsApp Broadcast'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  disabled={!message.trim()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-white text-[#14213D] border border-[#E3E6EB] rounded hover:bg-slate-50 disabled:opacity-50"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Mail className="w-3.5 h-3.5 text-[#B8923A]" />}
                  <span>{copiedEmail ? 'Copied Email Digest!' : 'Copy Email Digest'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E3E6EB]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 font-medium text-[#5B6472] bg-white border border-[#E3E6EB] rounded hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim()}
                className="px-4 py-1.5 font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors disabled:opacity-50 shadow-xs"
              >
                Send In-App Notice
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
