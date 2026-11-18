import React from 'react';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Calendar,
  User,
  Folder,
  Tag,
  BookOpen,
} from 'lucide-react';
import { useBackHandler } from '../../../hooks/useBackHandler';
import { GalleryItem } from '../../../types/learning';

export interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: GalleryItem | null;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-[#111c2d] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0c1421] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900/40">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  {document.title}
                </h3>
                {document.subcategory && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800">
                    {document.subcategory}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {document.file_name} • {document.file_size}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.allow_download !== false && (
              <a
                href={document.file_url}
                download={document.file_name || 'fni-document.pdf'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                title="Download Document"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}

            <a
              href={document.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Frame / Viewer Area */}
        <div className="flex-1 bg-slate-100 dark:bg-[#0c1421] p-2 sm:p-4 overflow-hidden flex flex-col">
          <iframe
            src={`${document.file_url}#toolbar=0`}
            title={document.title}
            className="w-full flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white shadow-xs"
          />
        </div>

        {/* Footer Metadata */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#111c2d] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 text-slate-500">
            {document.album_title && (
              <span className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
                <Folder className="w-3.5 h-3.5" />
                <span>{document.album_title}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>{new Date(document.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>{document.uploaded_by_name || 'FNI Directorate'}</span>
            </span>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Forerunners Network International • Training Document
          </p>
        </div>
      </div>
    </div>
  );
};
