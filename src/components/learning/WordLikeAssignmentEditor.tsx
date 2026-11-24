import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Image as ImageIcon,
  Paperclip,
  RotateCcw,
  Minus,
  Eye,
  Send,
  Save,
  X,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  ExternalLink,
  Trash2,
  FileCheck,
  HelpCircle,
} from 'lucide-react';
import { Assignment, LatePolicy, SubmissionFormat } from '../../types/learning';


const escapeImportedText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const readDocxHtml = async (file: File): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let endOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { endOffset = i; break; }
  }
  if (endOffset < 0) throw new Error('This does not appear to be a valid .docx file.');
  const entries = view.getUint16(endOffset + 10, true);
  let cursor = view.getUint32(endOffset + 16, true);
  let documentXml: Uint8Array | null = null;
  for (let i = 0; i < entries; i++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) break;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    if (name === 'word/document.xml') {
      const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      if (method === 0) documentXml = compressed;
      else if (method === 8 && typeof DecompressionStream !== 'undefined') {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));
        documentXml = new Uint8Array(await new Response(stream).arrayBuffer());
      } else throw new Error('This browser cannot unpack this Word document. Try saving it again as .docx.');
      break;
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (!documentXml) throw new Error('The Word document content could not be found.');
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(documentXml), 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('The Word document could not be read.');
  const paragraphs = Array.from(xml.getElementsByTagNameNS('*', 'p'));
  const html = paragraphs.map((paragraph) => {
    const style = paragraph.getElementsByTagNameNS('*', 'pStyle')[0]?.getAttribute('val') || '';
    const runs = Array.from(paragraph.getElementsByTagNameNS('*', 'r'));
    const content = runs.map((run) => {
      const value = Array.from(run.getElementsByTagNameNS('*', 't')).map(node => escapeImportedText(node.textContent || '')).join('');
      if (!value) return '';
      const props = run.getElementsByTagNameNS('*', 'rPr')[0];
      let formatted = value;
      if (props?.getElementsByTagNameNS('*', 'b').length) formatted = '<strong>' + formatted + '</strong>';
      if (props?.getElementsByTagNameNS('*', 'i').length) formatted = '<em>' + formatted + '</em>';
      if (props?.getElementsByTagNameNS('*', 'u').length) formatted = '<u>' + formatted + '</u>';
      return formatted;
    }).join('');
    if (!content.trim()) return '';
    const tag = /Heading1|Title/i.test(style) ? 'h1' : /Heading2/i.test(style) ? 'h2' : /Heading3/i.test(style) ? 'h3' : 'p';
    return '<' + tag + '>' + content + '</' + tag + '>';
  }).filter(Boolean);
  if (!html.length) throw new Error('No readable text was found in this Word document.');
  return html.join('');
};

interface WordLikeAssignmentEditorProps {
  initialAssignment?: Assignment | null;
  onSave: (assignmentData: Partial<Assignment>, status: 'draft' | 'published') => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export const WordLikeAssignmentEditor: React.FC<WordLikeAssignmentEditorProps> = ({
  initialAssignment,
  onSave,
  onCancel,
  isSaving = false,
}) => {
  // 1. First: Assignment Topic
  const [topic, setTopic] = useState(initialAssignment?.title || '');

  // 2. Second: Assignment Content (HTML formatted in Word-like canvas)
  const [contentHtml, setContentHtml] = useState(
    initialAssignment?.instructions || initialAssignment?.description || ''
  );
  const editorRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isImportingDocument, setIsImportingDocument] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  // 3. Settings below writing area
  const [totalMarks, setTotalMarks] = useState<string>(
    initialAssignment ? String(initialAssignment.total_marks) : '100'
  );
  const [publishedAt, setPublishedAt] = useState<string>(() => {
    if (initialAssignment?.published_at) {
      return initialAssignment.published_at.slice(0, 16);
    }
    return new Date().toISOString().slice(0, 16);
  });
  const [dueDate, setDueDate] = useState<string>(() => {
    if (initialAssignment?.due_date) {
      return initialAssignment.due_date.slice(0, 16);
    }
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    return nextWeek.toISOString().slice(0, 16);
  });
  const [latePolicy, setLatePolicy] = useState<LatePolicy>(
    initialAssignment?.late_policy || 'allow_with_penalty'
  );
  const [submissionFormat, setSubmissionFormat] = useState<SubmissionFormat>(
    initialAssignment?.submission_format || 'both'
  );
  const [maxAttempts, setMaxAttempts] = useState<number>(
    initialAssignment?.max_attempts !== undefined ? initialAssignment.max_attempts : 1
  );

  // Attachments
  const [attachments, setAttachments] = useState<
    { name: string; url: string; size?: string; type?: string }[]
  >(initialAssignment?.attachments || []);
  const [isAttachingFile, setIsAttachingFile] = useState(false);
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentSize, setNewAttachmentSize] = useState('1.2 MB');

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Sync content into contentEditable on mount
  useEffect(() => {
    if (editorRef.current && contentHtml && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = contentHtml;
    }
  }, []);

  // Sync contentEditable changes back to state
  const handleEditorInput = () => {
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  // Rich-Text Toolbar Execution
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const handleHeadingChange = (tag: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('formatBlock', false, tag);
    handleEditorInput();
  };

  const handleInsertImage = () => {
    const url = prompt('Enter the image URL to insert into assignment document:');
    if (url && url.trim()) {
      executeCommand('insertImage', url.trim());
    }
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim()) return;
    const item = {
      name: newAttachmentName.trim(),
      url: newAttachmentUrl.trim() || '#',
      size: newAttachmentSize.trim() || '1.0 MB',
      type: 'application/pdf',
    };
    setAttachments(prev => [...prev, item]);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
    setIsAttachingFile(false);
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };


  const handleImportWordFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setImportMessage('Please choose a Word .docx document.');
      return;
    }
    setIsImportingDocument(true);
    setImportMessage('');
    try {
      const importedHtml = await readDocxHtml(file);
      if (editorRef.current) editorRef.current.innerHTML = importedHtml;
      setContentHtml(importedHtml);
      setImportMessage(file.name + ' imported. Review the content before saving.');
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'The Word document could not be imported.');
    } finally {
      setIsImportingDocument(false);
    }
  };

  // Validation & Save Handler
  const handleTriggerSave = async (status: 'draft' | 'published') => {
    if (!topic.trim()) {
      alert('Please enter an Assignment Topic / Title.');
      return;
    }

    const currentHtml = editorRef.current ? editorRef.current.innerHTML : contentHtml;
    if (!currentHtml || currentHtml === '<br>' || !currentHtml.trim()) {
      alert('Please type the assignment content and instructions in the document area.');
      return;
    }

    const data: Partial<Assignment> = {
      id: initialAssignment?.id,
      title: topic.trim(),
      description: currentHtml.replace(/<[^>]*>?/gm, '').slice(0, 180) + '...',
      instructions: currentHtml,
      attachments,
      total_marks: Number(totalMarks) || 100,
      published_at: status === 'published' ? new Date(publishedAt).toISOString() : undefined,
      due_date: new Date(dueDate).toISOString(),
      late_policy: latePolicy,
      submission_format: submissionFormat,
      max_attempts: maxAttempts,
      status,
    };

    await onSave(data, status);
  };

  return (
    <div className="fixed inset-0 z-[70] h-[100dvh] w-full overflow-y-auto overscroll-y-contain bg-slate-50 dark:bg-[#0b1524] animate-fade-in pb-8">
      {/* 1. Header Banner */}
      <div className="sticky top-0 z-40 bg-[#142B4A] rounded-none sm:rounded-b-2xl px-3 py-3 sm:px-7 sm:py-5 text-white shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#C6A45A] text-[10px] font-bold uppercase tracking-wider mb-2 border border-white/10">
            <FileText className="w-3.5 h-3.5" />
            <span className="sm:inline">Assignment builder</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
            {initialAssignment ? 'Edit Assignment Document' : 'Create Assignment Document'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Write all instructions, questions, case studies, and rubrics seamlessly in one comprehensive document.
          </p>
        </div>

        {/* Action Controls in Top Bar */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 px-3 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <span aria-hidden="true">←</span> Back
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="min-h-11 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/15 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#C6A45A]" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleTriggerSave('draft')}
            className="min-h-11 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-300" />
            <span>Save Draft</span>
          </button>
          <a
            href="https://word.cloud.microsoft/create/en/document-editor/"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 col-span-2 sm:col-span-2 px-4 py-2 rounded-xl bg-white text-[#142B4A] hover:bg-slate-100 text-xs font-black transition-all flex items-center justify-center gap-2 border border-white/30 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-[#185ABD]" />
            <span>Write in Microsoft Word (Web)</span>
          </a>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleTriggerSave('published')}
            className="min-h-11 col-span-2 sm:col-span-1 px-4 py-2 rounded-xl bg-[#C6A45A] hover:bg-[#B3934B] text-[#142B4A] text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-[#142B4A]" />
            <span>Publish Assignment</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-3 sm:px-6 pt-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50 px-4 py-3 text-xs text-blue-900 dark:text-blue-100">
          <p className="font-bold mb-1">Import an existing Word document</p>
          <p className="mb-3">Choose a .docx file saved on this device. FNI imports its text and basic formatting into this editor so you can review and edit it before saving.</p>
          <input ref={importInputRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleImportWordFile} className="hidden" />
          <button type="button" disabled={isImportingDocument} onClick={() => importInputRef.current?.click()} className="min-h-11 rounded-lg bg-[#142B4A] px-4 py-2 font-bold text-white disabled:opacity-60">{isImportingDocument ? 'Importing document…' : 'Import Word document (.docx)'}</button>
          {importMessage && <p role="status" className="mt-2 font-semibold">{importMessage}</p>}
          <p className="mt-2 text-[11px] opacity-80">Or <a className="font-bold underline" href="https://word.cloud.microsoft/create/en/document-editor/" target="_blank" rel="noopener noreferrer">open Microsoft Word on the web</a> to create a document first.</p>
        </div>
      </div>

      {/* 2. Document Page Container (Styled like a Microsoft Word Paper Sheet) */}
      <div className="mx-3 sm:mx-6 mt-4 max-w-6xl sm:mx-auto bg-white dark:bg-[#111c2d] rounded-2xl sm:rounded-3xl border border-[#E3E8EF] dark:border-[#26384d] shadow-lg overflow-hidden">
        {/* Word Document Title Header (First: Assignment Topic) */}
        <div className="p-4 sm:p-8 border-b border-[#E3E8EF] dark:border-[#26384d] bg-gradient-to-b from-[#F8FAFC] to-white dark:from-[#172437] dark:to-[#111c2d]">
          <label className="block text-[11px] font-black uppercase tracking-wider text-[#667085] dark:text-slate-400 mb-2">
            Assignment title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Cell Multiplication Blueprint & Practical Discipleship Strategy"
            className="w-full min-h-12 text-lg sm:text-2xl font-black text-[#142B4A] dark:text-white placeholder-slate-300 dark:placeholder-slate-600 border-0 focus:outline-none focus:ring-0 bg-transparent"
          />
        </div>

        {/* Word Ribbon Toolbar */}
        <div className="p-2 sm:p-3 bg-[#F1F5F9] dark:bg-[#1a293f] border-b border-[#E3E8EF] dark:border-[#26384d] flex flex-nowrap sm:flex-wrap items-center gap-1.5 text-slate-700 dark:text-slate-200 sticky top-0 z-20 shadow-2xs overflow-x-auto overscroll-x-contain">
          {/* Headings Selector */}
          <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-700 pr-2 mr-1">
            <button
              type="button"
              onClick={() => handleHeadingChange('<p>')}
              className="px-2 py-1 rounded text-xs font-semibold hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Normal Paragraph"
            >
              Paragraph
            </button>
            <button
              type="button"
              onClick={() => handleHeadingChange('<h1>')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleHeadingChange('<h2>')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleHeadingChange('<h3>')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>
          </div>

          {/* Basic Text Formatting: Bold, Italic, Underline */}
          <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-700 pr-2 mr-1">
            <button
              type="button"
              onClick={() => executeCommand('bold')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4 font-black" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('italic')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('underline')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
          </div>

          {/* Lists: Numbered & Bulleted */}
          <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-700 pr-2 mr-1">
            <button
              type="button"
              onClick={() => executeCommand('insertOrderedList')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('insertUnorderedList')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Bullet Points"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Inserts: Image, Divider, File */}
          <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-700 pr-2 mr-1">
            <button
              type="button"
              onClick={handleInsertImage}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title="Insert Image"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Image</span>
            </button>
            <button
              type="button"
              onClick={() => executeCommand('insertHorizontalRule')}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Horizontal Divider"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsAttachingFile(prev => !prev)}
              className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title="Add Supporting File Attachment"
            >
              <Paperclip className="w-4 h-4 text-[#C6A45A]" />
              <span className="hidden sm:inline">Attach File</span>
              {attachments.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#142B4A] text-white text-[9px] flex items-center justify-center font-bold">
                  {attachments.length}
                </span>
              )}
            </button>
          </div>

          {/* Undo / Clear formatting */}
          <button
            type="button"
            onClick={() => executeCommand('removeFormat')}
            className="p-1.5 rounded hover:bg-white dark:hover:bg-[#111c2d] text-slate-500 hover:text-slate-800 transition-colors cursor-pointer ml-auto"
            title="Clear Formatting"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Attachment Popup / Input Tray */}
        {isAttachingFile && (
          <div className="p-4 bg-amber-50/80 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row items-center gap-3 animate-fade-in text-xs">
            <div className="flex-1 w-full">
              <input
                type="text"
                value={newAttachmentName}
                onChange={e => setNewAttachmentName(e.target.value)}
                placeholder="Attachment file name (e.g. Cell_Multiplication_Guide.pdf)"
                className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-[#111c2d] text-slate-800 dark:text-white"
              />
            </div>
            <div className="w-full sm:w-48">
              <input
                type="text"
                value={newAttachmentUrl}
                onChange={e => setNewAttachmentUrl(e.target.value)}
                placeholder="Download Link / URL (optional)"
                className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-[#111c2d] text-slate-800 dark:text-white"
              />
            </div>
            <div className="w-full sm:w-28">
              <input
                type="text"
                value={newAttachmentSize}
                onChange={e => setNewAttachmentSize(e.target.value)}
                placeholder="Size (e.g. 2.4 MB)"
                className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-[#111c2d] text-slate-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddAttachment}
                className="px-3 py-1.5 rounded-lg bg-[#142B4A] text-white font-bold text-xs hover:bg-[#203D63] cursor-pointer"
              >
                Add File
              </button>
              <button
                type="button"
                onClick={() => setIsAttachingFile(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Existing Attached Files Badges */}
        {attachments.length > 0 && (
          <div className="px-6 py-2.5 bg-slate-50 dark:bg-[#172437] border-b border-[#E3E8EF] dark:border-[#26384d] flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[#667085] flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5 text-[#C6A45A]" />
              Attached Supporting Files:
            </span>
            {attachments.map((att, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#111c2d] border border-slate-200 dark:border-slate-700 text-[#142B4A] dark:text-white text-[11px] font-semibold"
              >
                <span>{att.name}</span>
                {att.size && <span className="text-slate-400 text-[10px]">({att.size})</span>}
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Large Rich-Text Writing Canvas (Second: Assignment Content) */}
        <div className="p-4 sm:p-10 min-h-[320px] sm:min-h-[460px] max-w-4xl mx-auto">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            className="prose dark:prose-invert max-w-none min-h-[280px] sm:min-h-[400px] focus:outline-none text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-relaxed tracking-normal"
            style={{ wordBreak: 'break-word' }}
            data-placeholder="Start typing your complete assignment here. Write instructions, questions, explanations, subsections, and case studies..."
          />
        </div>
      </div>

      {/* 3. Assignment Submission Settings Panel */}
      <div className="mx-3 sm:mx-6 mt-4 mb-8 max-w-6xl sm:mx-auto bg-white dark:bg-[#111c2d] rounded-2xl sm:rounded-3xl border border-[#E3E8EF] dark:border-[#26384d] p-4 sm:p-8 shadow-sm space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#E3E8EF] dark:border-[#26384d]">
          <FileCheck className="w-5 h-5 text-[#C6A45A]" />
          <div>
            <h3 className="font-extrabold text-base text-[#142B4A] dark:text-white">
              Assignment Submission Settings
            </h3>
            <p className="text-xs text-[#667085] dark:text-slate-400">
              Configure total marks, distribution schedule, deadlines, submission format, and attempt limits.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 text-xs">
          {/* Total Marks */}
          <div>
            <label className="block font-bold text-[#142B4A] dark:text-white mb-1.5">
              Total Marks <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={totalMarks}
              onChange={e => setTotalMarks(e.target.value)}
              min="1"
              max="1000"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A] font-bold"
            />
          </div>

          {/* Publication Date & Time */}
          <div>
            <label className="block font-bold text-[#142B4A] dark:text-white mb-1.5">
              Publication Date / Time
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={e => setPublishedAt(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            />
          </div>

          {/* Submission Deadline */}
          <div>
            <label className="block font-bold text-[#142B4A] dark:text-white mb-1.5">
              Submission Deadline <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A] font-semibold"
            />
          </div>

          {/* Late-Submission Policy */}
          <div>
            <label className="block font-bold text-[#142B4A] dark:text-white mb-1.5">
              Late-Submission Policy
            </label>
            <select
              value={latePolicy}
              onChange={e => setLatePolicy(e.target.value as LatePolicy)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            >
              <option value="allow_with_penalty">Accept Late (Mark with Penalty)</option>
              <option value="allow_no_penalty">Accept Late (No Penalty)</option>
              <option value="reject_late">Strict Cutoff (Reject Late Submissions)</option>
            </select>
          </div>

          {/* Submission Format */}
          <div>
            <label className="block font-bold text-[#142B4A] dark:text-white mb-1.5">
              Submission Format
            </label>
            <select
              value={submissionFormat}
              onChange={e => setSubmissionFormat(e.target.value as SubmissionFormat)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
            >
              <option value="both">Both Written Response & File Upload</option>
              <option value="written">Written Response Only</option>
              <option value="file">File Upload Only</option>
            </select>
          </div>

          {/* Maximum Submission Attempts */}
          <div>
            <label className="block font-bold text-[#142B4A] dark:text-white mb-1.5">
              Maximum Submission Attempts <span className="text-[#C6A45A]">&bull; Required</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { value: 1, label: '1 Attempt' },
                { value: 2, label: '2 Attempts' },
                { value: 3, label: '3 Attempts' },
                { value: 5, label: '5 Attempts' },
                { value: 0, label: 'Unlimited' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMaxAttempts(opt.value)}
                  className={`min-h-11 py-2 px-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                    maxAttempts === opt.value
                      ? 'bg-[#142B4A] text-white border-[#142B4A] shadow-xs'
                      : 'bg-slate-50 dark:bg-[#172437] text-slate-700 dark:text-slate-300 border-[#E3E8EF] dark:border-[#26384d] hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#667085] mt-1.5">
              {maxAttempts === 0
                ? 'Tutors can resubmit new versions freely before deadline.'
                : `Tutors are restricted to exactly ${maxAttempts} submission attempt(s).`}
            </p>
          </div>
        </div>

        {/* Bottom Action Ribbon */}
        <div className="pt-4 border-t border-[#E3E8EF] dark:border-[#26384d] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-[#667085]">
            Auto-distributed to all active tutors across all registered fellowship cells.
          </div>
          <div className="grid grid-cols-1 sm:flex items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="min-h-11 w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] text-xs font-bold text-[#142B4A] dark:text-white hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#C6A45A]" />
              <span>Preview Assignment</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleTriggerSave('draft')}
              className="min-h-11 w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl border border-[#142B4A]/20 bg-slate-50 dark:bg-[#172437] text-xs font-bold text-[#142B4A] dark:text-white hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleTriggerSave('published')}
              className="min-h-11 w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-[#C6A45A]" />
              <span>{isSaving ? 'Publishing...' : 'Publish Assignment Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Tutor Preview Modal (Shows exactly what tutors will see) */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111c2d] w-full max-w-3xl rounded-3xl shadow-2xl border border-[#E3E8EF] dark:border-[#26384d] overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-[#142B4A] px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 text-[#C6A45A] flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C6A45A]">
                    Tutor Experience Preview
                  </span>
                  <h3 className="font-extrabold text-base tracking-tight text-white">
                    {topic || 'Untitled Assignment'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-xs sm:text-sm">
              {/* Metadata Chip Row */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#172437] border border-[#E3E8EF] dark:border-[#26384d] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#667085]">Total Marks</div>
                  <div className="font-black text-[#142B4A] dark:text-white text-base mt-0.5">
                    {totalMarks} Marks
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#667085]">Deadline</div>
                  <div className="font-bold text-[#182230] dark:text-white mt-0.5">
                    {new Date(dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#667085]">Max Attempts</div>
                  <div className="font-bold text-[#182230] dark:text-white mt-0.5">
                    {maxAttempts === 0 ? 'Unlimited' : `${maxAttempts} Attempt(s)`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#667085]">Submission Type</div>
                  <div className="font-bold text-[#182230] dark:text-white mt-0.5 capitalize">
                    {submissionFormat}
                  </div>
                </div>
              </div>

              {/* Formatted Assignment Content */}
              <div className="bg-white dark:bg-[#172437] p-6 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
                <div className="text-xs font-black uppercase tracking-wider text-[#667085] mb-3 pb-2 border-b border-[#E3E8EF] dark:border-[#26384d]">
                  Assignment Instructions & Question Document
                </div>
                <div
                  className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: contentHtml || '<p class="text-slate-400 italic">No content typed yet.</p>',
                  }}
                />
              </div>

              {/* Supporting Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#142B4A] dark:text-white flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#C6A45A]" />
                    <span>Downloadable Materials ({attachments.length}):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="truncate">
                            <div className="font-bold text-xs truncate">{att.name}</div>
                            {att.size && <div className="text-[10px] text-slate-400">{att.size}</div>}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#C6A45A]">Download</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulated Tutor Response Submission Area */}
              <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#172437] border-2 border-dashed border-[#C6A45A]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-[#142B4A] dark:text-white uppercase tracking-wider">
                    Tutor Response Area
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    Remaining Attempts: {maxAttempts === 0 ? 'Unlimited' : maxAttempts}
                  </span>
                </div>
                {(submissionFormat === 'both' || submissionFormat === 'written') && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Written Response / Question Answers
                    </label>
                    <textarea
                      disabled
                      placeholder="Tutors type their complete written responses, calculations, or reflections here..."
                      rows={3}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111c2d] text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                )}
                {(submissionFormat === 'both' || submissionFormat === 'file') && (
                  <div className="p-3 rounded-xl bg-white dark:bg-[#111c2d] border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    File Upload Area (PDF, Word, Excel, Images up to 25MB)
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F8FAFC] dark:bg-[#172437] border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between">
              <span className="text-[11px] text-[#667085]">
                Tutors cannot modify the original document.
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#142B4A] text-white font-bold text-xs hover:bg-[#203D63] transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
