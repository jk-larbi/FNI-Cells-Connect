import React, { useState, useEffect } from 'react';
import {
  Library,
  Plus,
  Search,
  Download,
  BookOpen,
  Clock,
  Filter,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LearningResource } from '../../types/learning';
import { LearningService } from '../../services/learningService';

export const LearningMaterialsView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Modal (Admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<LearningResource['category']>('leadership');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('2.4 MB');
  const [readingTime, setReadingTime] = useState('15');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadResources();
  }, [isAdmin]);

  useEffect(() => {
    const handleLearningResourceChange = (event: Event) => {
      const table = (event as CustomEvent<{ table?: string }>).detail?.table;
      if (!table || table === '*' || table === 'learning_resources') {
        void loadResources();
      }
    };
    window.addEventListener('fni:cloud-data-changed', handleLearningResourceChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleLearningResourceChange);
  }, [isAdmin]);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const data = await LearningService.getResources(isAdmin);
      setResources(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setTitle('');
    setDescription('');
    setCategory('leadership');
    setFileName('');
    setFileUrl('');
    setFileSize('2.0 MB');
    setReadingTime('15');
    setIsModalOpen(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a document title.');
      return;
    }

    setIsSaving(true);
    try {
      await LearningService.saveResource(
        {
          title: title.trim(),
          description: description.trim(),
          category,
          file_name: fileName.trim() || `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          file_url: fileUrl.trim() || '#',
          file_size: fileSize.trim() || '1.8 MB',
          reading_time_minutes: Number(readingTime) || 15,
          status: 'published',
        },
        { id: currentUser.id, name: currentUser.full_name }
      );

      setIsModalOpen(false);
      loadResources();
      alert('New learning material published for all active cell leaders!');
    } catch (err: any) {
      alert(err.message || 'Failed to publish resource.');
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Resources' },
    { id: 'cell_operations', label: 'Cell Operations' },
    { id: 'evangelism', label: 'Evangelism & Harvest' },
    { id: 'leadership', label: 'Shepherding & Leadership' },
    { id: 'theology', label: 'Core Doctrine' },
    { id: 'discipleship', label: 'Discipleship' },
  ];

  const filtered = resources.filter(res => {
    if (categoryFilter !== 'all' && res.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        res.title.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q) ||
        res.file_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#142B4A] dark:text-white">
              Official Learning Materials & Library
            </h2>
            <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
              Approved cell multiplication manuals, evangelism handbooks, and discipleship guides.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenModal}
            className="px-4 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#C6A45A]" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111c2d] p-3 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs space-y-3">
        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold text-[#667085] custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-[#142B4A] text-white shadow-2xs'
                  : 'bg-[#F5F7FA] dark:bg-[#172437] hover:text-[#182230] dark:hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search manuals, doctrine guides, or frameworks..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Resources Card Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d]">
          <Library className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
            No learning materials found
          </h3>
          <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
            {isAdmin
              ? 'Click "Upload Document" above to add official study materials for cell leaders.'
              : 'Try selecting a different category or clearing your search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(res => (
            <div
              key={res.id}
              className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                    {res.category.replace('_', ' ')}
                  </span>

                  <div className="flex items-center gap-2 text-[11px] text-[#667085]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#C6A45A]" />
                      {res.reading_time_minutes} min read
                    </span>
                    <span>&bull;</span>
                    <span>{res.file_size}</span>
                  </div>
                </div>

                <h3 className="font-bold text-base text-[#182230] dark:text-white leading-snug">
                  {res.title}
                </h3>
                <p className="text-xs text-[#667085] dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {res.description}
                </p>

                <div className="mt-3 p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#172437] border border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#142B4A] dark:text-slate-200 font-semibold truncate">
                    <FileText className="w-4 h-4 text-[#C6A45A] shrink-0" />
                    <span className="truncate">{res.file_name}</span>
                  </div>
                  <span className="text-[10px] text-[#667085] uppercase font-bold shrink-0 ml-2">
                    PDF DOC
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between">
                <span className="text-[10px] text-[#667085]">
                  Published by {res.uploaded_by_name}
                </span>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Remove material "${res.title}"?`)) {
                          await LearningService.deleteResource(res.id);
                          loadResources();
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#C74646] hover:bg-rose-50"
                      title="Delete Material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      alert(`Initiating download for "${res.file_name}" (${res.file_size}).`);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C6A45A]" />
                    <span>Download Material</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-lg w-full p-4 sm:p-8 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-4 sm:my-8 max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <h3 className="font-bold text-[#142B4A] dark:text-white">
                  Upload Learning Material
                </h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  General distribution to all active cell tutors across fellowships.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. The Blueprint for Cell Church Multiplication"
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Description & Key Focus *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Summary of this training material and its application in fellowship life..."
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  >
                    <option value="cell_operations">Cell Operations</option>
                    <option value="evangelism">Evangelism & Harvest</option>
                    <option value="leadership">Shepherding & Leadership</option>
                    <option value="theology">Core Doctrine</option>
                    <option value="discipleship">Discipleship</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Est. Reading Time (Mins)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={readingTime}
                    onChange={e => setReadingTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    File Name
                  </label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    placeholder="e.g. Cell_Guide_2026.pdf"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    File Size
                  </label>
                  <input
                    type="text"
                    value={fileSize}
                    onChange={e => setFileSize(e.target.value)}
                    placeholder="e.g. 2.4 MB"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>{isSaving ? 'Publishing...' : 'Publish to Library'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
