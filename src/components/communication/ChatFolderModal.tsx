import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  MessageSquare,
  Users,
  User,
  Heart,
  Shield,
  Flame,
  Bookmark,
  Briefcase,
  Zap,
  Bell,
  Compass,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Layers,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { MessagingService } from '../../services/messagingService';
import { useAuth } from '../../context/AuthContext';
import { ChatFolder, ChatFolderCreateInput, ChatFolderUpdateInput } from '../../types';

export interface ChatFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableChats: Array<{
    id: string;
    name: string;
    role?: string;
    cellName?: string;
    type: 'community' | 'direct' | 'saved' | 'group';
    avatarUrl?: string;
    unreadCount?: number;
  }>;
  initialEditingFolder?: ChatFolder | null;
  onFoldersUpdated: (folders: ChatFolder[]) => void;
}

export const FOLDER_ICONS: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  folder: { label: 'Folder', icon: Folder },
  message: { label: 'Messages', icon: MessageSquare },
  users: { label: 'Groups & Cells', icon: Users },
  user: { label: 'Personal', icon: User },
  heart: { label: 'Heart & Care', icon: Heart },
  shield: { label: 'Leadership', icon: Shield },
  flame: { label: 'Evangelism', icon: Flame },
  bookmark: { label: 'Notes', icon: Bookmark },
  briefcase: { label: 'Ministry Work', icon: Briefcase },
  zap: { label: 'Urgent', icon: Zap },
  bell: { label: 'Announcements', icon: Bell },
  compass: { label: 'Fellowship', icon: Compass },
};

export const FOLDER_COLORS: Record<string, { label: string; bg: string; text: string; border: string; activeClass: string }> = {
  blue: {
    label: 'Royal Blue',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-[#2AABEE]',
    border: 'border-[#2AABEE]',
    activeClass: 'bg-[#2AABEE] text-white',
  },
  gold: {
    label: 'Warm Gold',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-[#C6A45A]',
    border: 'border-[#C6A45A]',
    activeClass: 'bg-[#C6A45A] text-[#142B4A]',
  },
  emerald: {
    label: 'Evangelism Emerald',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-500',
    border: 'border-emerald-500',
    activeClass: 'bg-emerald-500 text-white',
  },
  purple: {
    label: 'Apostolic Purple',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-500',
    border: 'border-purple-500',
    activeClass: 'bg-purple-500 text-white',
  },
  rose: {
    label: 'Fellowship Rose',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-500',
    border: 'border-rose-500',
    activeClass: 'bg-rose-500 text-white',
  },
  indigo: {
    label: 'Deep Indigo',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-500',
    border: 'border-indigo-500',
    activeClass: 'bg-indigo-500 text-white',
  },
  amber: {
    label: 'Harvest Amber',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-500',
    border: 'border-amber-500',
    activeClass: 'bg-amber-500 text-white',
  },
};

export const ChatFolderModal: React.FC<ChatFolderModalProps> = ({
  isOpen,
  onClose,
  availableChats,
  initialEditingFolder = null,
  onFoldersUpdated,
}) => {
  const { currentUser } = useAuth();
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');

  // Editor form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [includedChatIds, setIncludedChatIds] = useState<string[]>([]);
  const [includeAllGroups, setIncludeAllGroups] = useState(false);
  const [includeAllDirect, setIncludeAllDirect] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Deletion confirmation dialog
  const [folderToDelete, setFolderToDelete] = useState<ChatFolder | null>(null);

  useBackHandler(() => {
    if (isOpen) {
      if (viewMode === 'editor') {
        setViewMode('list');
        return true;
      }
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  // Load user's folders from Supabase
  const loadUserFolders = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const list = await MessagingService.getUserChatFolders(currentUser.id);
      setFolders(list);
      onFoldersUpdated(list);
    } catch (err) {
      console.warn('Error loading chat folders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      loadUserFolders();
      if (initialEditingFolder) {
        startEditing(initialEditingFolder);
      } else {
        setViewMode('list');
      }
    }
  }, [isOpen, currentUser?.id, initialEditingFolder]);

  const startCreating = () => {
    setEditingId(null);
    setFolderName('');
    setSelectedIcon('folder');
    setSelectedColor('blue');
    setIncludedChatIds([]);
    setIncludeAllGroups(false);
    setIncludeAllDirect(false);
    setChatSearchQuery('');
    setErrorMessage(null);
    setViewMode('editor');
  };

  const startEditing = (folder: ChatFolder) => {
    setEditingId(folder.id);
    setFolderName(folder.name);
    setSelectedIcon(folder.icon || 'folder');
    setSelectedColor(folder.color || 'blue');
    setIncludedChatIds(folder.included_chat_ids || []);
    setIncludeAllGroups(Boolean(folder.include_all_groups));
    setIncludeAllDirect(Boolean(folder.include_all_direct));
    setChatSearchQuery('');
    setErrorMessage(null);
    setViewMode('editor');
  };

  const handleToggleChat = (chatId: string) => {
    setIncludedChatIds(prev =>
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    const trimmed = folderName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a folder name.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      if (editingId) {
        // Update existing folder
        const updatePayload: ChatFolderUpdateInput = {
          name: trimmed,
          icon: selectedIcon,
          color: selectedColor,
          included_chat_ids: includedChatIds,
          include_all_groups: includeAllGroups,
          include_all_direct: includeAllDirect,
        };
        const res = await MessagingService.updateChatFolder(currentUser.id, editingId, updatePayload);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to update chat folder.');
          return;
        }
      } else {
        // Create new folder
        const createPayload: ChatFolderCreateInput = {
          name: trimmed,
          icon: selectedIcon,
          color: selectedColor,
          included_chat_ids: includedChatIds,
          include_all_groups: includeAllGroups,
          include_all_direct: includeAllDirect,
        };
        const res = await MessagingService.createChatFolder(currentUser.id, createPayload);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to create chat folder.');
          return;
        }
      }

      await loadUserFolders();
      setViewMode('list');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error saving folder.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!currentUser?.id || !folderToDelete) return;
    try {
      setSaving(true);
      const res = await MessagingService.deleteChatFolder(currentUser.id, folderToDelete.id);
      if (res.success) {
        setFolderToDelete(null);
        await loadUserFolders();
      } else {
        alert(res.error || 'Failed to delete folder.');
      }
    } catch (err) {
      console.warn('Error deleting folder:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveFolder = async (folderId: string, direction: 'up' | 'down') => {
    if (!currentUser?.id) return;
    const index = folders.findIndex(f => f.id === folderId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= folders.length) return;

    const copy = [...folders];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setFolders(copy);
    onFoldersUpdated(copy);

    const reorderedIds = copy.map(f => f.id);
    await MessagingService.reorderChatFolders(currentUser.id, reorderedIds);
  };

  // Filtered chats inside the chat picker
  const filteredAvailableChats = useMemo(() => {
    if (!chatSearchQuery.trim()) return availableChats;
    const q = chatSearchQuery.toLowerCase();
    return availableChats.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.cellName?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q)
    );
  }, [availableChats, chatSearchQuery]);

  if (!isOpen) return null;

  const ActiveIconComponent = FOLDER_ICONS[selectedIcon]?.icon || Folder;
  const activeColorConfig = FOLDER_COLORS[selectedColor] || FOLDER_COLORS.blue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-slate-50/50 dark:bg-black/20">
          <div className="flex items-center gap-3">
            {viewMode === 'editor' ? (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                title="Back to folders list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-[#2AABEE] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {viewMode === 'editor'
                  ? editingId
                    ? 'Edit Chat Folder'
                    : 'Create New Folder'
                  : 'Chat Folders'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {viewMode === 'editor'
                  ? 'Organize your fellowship & tutor chats'
                  : 'Personal folders for your conversations'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* VIEW MODE 1: LIST EXISTING FOLDERS */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {/* Top Create Card */}
              <button
                type="button"
                onClick={startCreating}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-[#2AABEE]/40 hover:border-[#2AABEE] bg-blue-50/40 dark:bg-[#2AABEE]/5 hover:bg-blue-50/80 dark:hover:bg-[#2AABEE]/10 flex items-center justify-center gap-2.5 text-xs font-bold text-[#2AABEE] transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-full bg-[#2AABEE] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span>Create New Chat Folder</span>
              </button>

              {/* Folders List */}
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2AABEE]" />
                  <span>Loading your chat folders...</span>
                </div>
              ) : folders.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-3xl bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center">
                    <Folder className="w-6 h-6 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Custom Folders Yet</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Create custom folders to organize cell leaders, evangelism teams, leadership updates, and private chats.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>Your Folders ({folders.length})</span>
                    <span>Reorder & Manage</span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden bg-slate-50/30 dark:bg-black/10">
                    {folders.map((folder, idx) => {
                      const IconComp = FOLDER_ICONS[folder.icon]?.icon || Folder;
                      const colorCfg = FOLDER_COLORS[folder.color] || FOLDER_COLORS.blue;
                      const count = (folder.included_chat_ids || []).length;

                      return (
                        <div
                          key={folder.id}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${colorCfg.bg} ${colorCfg.text}`}>
                              <IconComp className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {folder.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {count} conversation{count === 1 ? '' : 's'}
                                {folder.include_all_groups ? ' • All Groups' : ''}
                                {folder.include_all_direct ? ' • All Direct' : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Reorder Buttons */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveFolder(folder.id, 'up')}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              title="Move folder left/up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === folders.length - 1}
                              onClick={() => handleMoveFolder(folder.id, 'down')}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              title="Move folder right/down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => startEditing(folder)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-500 hover:text-[#2AABEE] transition-colors cursor-pointer ml-1"
                              title="Edit folder details and chats"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setFolderToDelete(folder)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: FOLDER EDITOR (CREATE OR EDIT) */}
          {viewMode === 'editor' && (
            <form onSubmit={handleSave} className="space-y-5">
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Folder Name & Live Preview */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Folder Name
                </label>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${activeColorConfig.bg} ${activeColorConfig.text} ${activeColorConfig.border}`}>
                    <ActiveIconComponent className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={32}
                    value={folderName}
                    onChange={e => setFolderName(e.target.value)}
                    placeholder="e.g. Cell Leaders, Prayer, Evangelism"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#182533] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2AABEE]"
                  />
                </div>
              </div>

              {/* Color Accent Picker */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Color Accent
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {Object.entries(FOLDER_COLORS).map(([colorKey, cfg]) => {
                    const isSelected = selectedColor === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setSelectedColor(colorKey)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? `${cfg.activeClass} shadow-xs scale-105`
                            : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Picker */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Folder Icon
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
                  {Object.entries(FOLDER_ICONS).map(([iconKey, cfg]) => {
                    const IconElem = cfg.icon;
                    const isSelected = selectedIcon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setSelectedIcon(iconKey)}
                        className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                          isSelected
                            ? `${activeColorConfig.bg} ${activeColorConfig.text} ${activeColorConfig.border} ring-2 ring-[#2AABEE]/40`
                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                        title={cfg.label}
                      >
                        <IconElem className="w-5 h-5" />
                        <span className="text-[9px] font-bold truncate max-w-[50px]">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Inclusion Category Filters */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Quick Category Filters
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#2AABEE]" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">Include All Groups & Cells</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeAllGroups}
                      onChange={e => setIncludeAllGroups(e.target.checked)}
                      className="rounded text-[#2AABEE] focus:ring-[#2AABEE] w-4 h-4 cursor-pointer"
                    />
                  </label>

                  <label className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#C6A45A]" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">Include All Direct Chats</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeAllDirect}
                      onChange={e => setIncludeAllDirect(e.target.checked)}
                      className="rounded text-[#2AABEE] focus:ring-[#2AABEE] w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Conversation Selector */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Included Conversations ({includedChatIds.length})
                  </label>
                  {includedChatIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIncludedChatIds([])}
                      className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Search Bar for Chats */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={chatSearchQuery}
                    onChange={e => setChatSearchQuery(e.target.value)}
                    placeholder="Search conversations to include..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#182533] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2AABEE]"
                  />
                </div>

                {/* Selected Chat Chips Preview */}
                {includedChatIds.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                    {includedChatIds.map(cid => {
                      const chat = availableChats.find(c => c.id === cid);
                      const name = chat?.name || (cid === 'community' ? 'FNI Community' : cid === 'saved_messages' ? 'Saved Messages' : cid);
                      return (
                        <span
                          key={cid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-[11px] font-bold text-slate-800 dark:text-slate-200 shrink-0 border border-slate-200/80 dark:border-white/10"
                        >
                          <span className="truncate max-w-[120px]">{name}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleChat(cid)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Available Chats Checklist */}
                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-white/10 rounded-2xl divide-y divide-slate-100 dark:divide-white/5 bg-slate-50/20 dark:bg-black/10">
                  {filteredAvailableChats.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No conversations found matching query.
                    </div>
                  ) : (
                    filteredAvailableChats.map(c => {
                      const isIncluded = includedChatIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleChat(c.id)}
                          className={`p-2.5 flex items-center justify-between gap-3 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                            isIncluded ? 'bg-blue-50/40 dark:bg-[#2AABEE]/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#142B4A] to-[#203D63] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {c.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {c.name}
                              </h5>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {c.cellName || c.role || (c.type === 'community' ? 'Group Fellowship' : 'Direct Conversation')}
                              </p>
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            isIncluded
                              ? 'bg-[#2AABEE] border-[#2AABEE] text-white'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#182533]'
                          }`}>
                            {isIncluded && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{editingId ? 'Save Changes' : 'Create Folder'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {folderToDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-sm bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Delete "{folderToDelete.name}"?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Deleting this folder will only remove the folder organization. No chats, messages, or media will be deleted, and all conversations remain accessible under All Chats.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFolderToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmDeleteFolder}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete Folder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
