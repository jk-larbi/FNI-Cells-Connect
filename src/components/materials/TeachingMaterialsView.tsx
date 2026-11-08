import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TeachingMaterialService } from '../../services/teachingMaterialService';
import { TeachingMaterial } from '../../types';
import {
  BookOpen,
  Plus,
  Download,
  Calendar,
  FileText,
  Search,
  CheckCircle2,
  Archive,
  Eye,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button';

export const TeachingMaterialsView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [materials, setMaterials] = useState<TeachingMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<TeachingMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Admin Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weekLabel, setWeekLabel] = useState(`Week ${Math.ceil(new Date().getDate() / 7)} - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`);
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const loadMaterials = async () => {
    try {
      setIsLoading(true);
      const list = await TeachingMaterialService.getMaterials(isAdmin);
      setMaterials(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [currentUser, isAdmin]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsUploading(true);
    try {
      await TeachingMaterialService.uploadMaterial({
        title: title.trim(),
        description: description.trim(),
        weekLabel: weekLabel.trim(),
        textContent: content.trim(),
        documentUrl: fileUrl.trim() || undefined,
        fileName: fileName.trim() || (fileUrl.trim() ? 'Teaching_Outline.pdf' : undefined),
        uploadedBy: currentUser.id,
        uploadedByName: currentUser.full_name,
        status: 'published',
      });

      setShowUploadModal(false);
      setTitle('');
      setDescription('');
      setContent('');
      setFileUrl('');
      setFileName('');
      await loadMaterials();
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleStatus = async (item: TeachingMaterial) => {
    const nextStatus = item.status === 'published' ? 'archived' : 'published';
    await TeachingMaterialService.updateMaterialStatus(item.id, nextStatus);
    await loadMaterials();
  };

  const handleDownloadText = (item: TeachingMaterial) => {
    const element = document.createElement('a');
    const file = new Blob([
      `FNI CELL TEACHING OUTLINE\n========================\nTitle: ${item.title}\nWeekly Cycle: ${item.weekLabel}\nAuthor: ${item.uploadedByName || item.uploadedBy}\nDate: ${item.createdAt}\n\nDESCRIPTION & SCRIPTURES:\n${item.description}\n\nOUTLINE CONTENT:\n${item.textContent || 'Refer to central ministry manual'}`
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${item.title.replace(/\s+/g, '_')}_Outline.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filtered = materials.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.weekLabel.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-gold-50 text-gold-700 border border-gold-200 mb-1">
            <BookOpen className="w-3 h-3 text-gold-600" />
            Word & Doctrine Repository
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-950 tracking-tight">
            Teaching Outlines & Discussion Guides
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Weekly cell study notes, scriptural outlines, and discipleship material published by FNI Ministry leadership.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-navy-950 text-white text-xs font-bold hover:bg-navy-900 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Publish New Outline</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search outlines by title, scripture (e.g. John 3:16, Romans 8), topic..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-600 text-slate-800"
          />
        </div>
      </div>

      {/* Grid of Teaching Outlines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-navy-950">No Outlines Found</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Click "Publish New Outline" above to provide weekly discussion notes for your tutors.'
                : 'Teaching outlines for upcoming cell meetings will appear here once published.'}
            </p>
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex flex-col justify-between hover:border-gold-300 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-navy-900 bg-navy-50 px-2 py-0.5 rounded-md border border-navy-100">
                    {item.weekLabel}
                  </span>
                  {item.status === 'archived' && (
                    <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      Archived
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-navy-950 group-hover:text-gold-700 transition-colors line-clamp-2">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  By {item.uploadedByName || item.uploadedBy}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedMaterial(item)}
                    className="p-1.5 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Read & Preview Outline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDownloadText(item)}
                    className="p-1.5 rounded-lg bg-gold-50 text-gold-700 hover:bg-gold-100 transition-colors"
                    title="Download Outline"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.status === 'published' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      title={item.status === 'published' ? 'Archive Outline' : 'Publish Outline'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PREVIEW MODAL */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-gold-700 uppercase tracking-wider">
                  {selectedMaterial.weekLabel}
                </span>
                <h2 className="text-lg font-bold text-navy-950 mt-0.5">
                  {selectedMaterial.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedMaterial(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-4 text-xs">
              <div className="p-4 bg-navy-50/70 rounded-2xl border border-navy-100">
                <span className="font-bold text-navy-950 block mb-1 uppercase tracking-wider text-[10px]">
                  Scriptures & Core Focus:
                </span>
                <p className="text-navy-900 leading-relaxed font-medium">
                  {selectedMaterial.description}
                </p>
              </div>

              {selectedMaterial.textContent ? (
                <div>
                  <span className="font-bold text-slate-700 block mb-1 uppercase tracking-wider text-[10px]">
                    Full Study Notes & Teaching Points:
                  </span>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 whitespace-pre-line text-slate-800 leading-relaxed font-sans">
                    {selectedMaterial.textContent}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Full text outline not embedded. Download or access the reference guide via the button below.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Published by {selectedMaterial.uploadedBy} on {new Date(selectedMaterial.createdAt).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleDownloadText(selectedMaterial)}
                  leftIcon={<Download className="w-3.5 h-3.5 text-gold-400" />}
                  className="rounded-xl px-4"
                >
                  Download Teaching Notes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-navy-950">Publish Weekly Teaching Outline</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-xs text-slate-400 hover:text-navy-950"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Outline Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Walking in Resurrection Power"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Weekly Cycle Label *</label>
                <input
                  type="text"
                  required
                  value={weekLabel}
                  onChange={e => setWeekLabel(e.target.value)}
                  placeholder="e.g. Week 2 - November 2026"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scriptures & Overview *</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Key scriptures (e.g. Eph 1:19-23, Phil 3:10) and summary overview..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Outline Content / Notes</label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="I. Introduction&#10;II. Point 1: Deliverance through Grace&#10;III. Point 2: Living by Faith&#10;IV. Cell Discussion Questions..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">External File URL (Optional)</label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={e => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or ministry cloud link"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isUploading}
                  className="rounded-xl px-5"
                >
                  Publish to All Tutors
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
