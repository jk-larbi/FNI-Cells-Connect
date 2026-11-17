import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Download,
  Eye,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  Send,
  X,
  FileCheck,
  ChevronDown,
  History,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  Assignment,
  AssignmentSubmission,
  LatePolicy,
  SubmissionFormat,
  SubmissionStatus,
} from '../../types/learning';
import { LearningService } from '../../services/learningService';

interface LearningAssignmentsViewProps {
  assignments: Assignment[];
  onRefresh: () => void;
}

export const LearningAssignmentsView: React.FC<LearningAssignmentsViewProps> = ({
  assignments,
  onRefresh,
}) => {
  const { currentUser, isAdmin } = useAuth();

  // Filter state
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Modal: Create / Edit Assignment
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formTotalMarks, setFormTotalMarks] = useState('100');
  const [formDueDate, setFormDueDate] = useState('');
  const [formLatePolicy, setFormLatePolicy] = useState<LatePolicy>('allow_with_penalty');
  const [formFormat, setFormFormat] = useState<SubmissionFormat>('both');
  const [formMaxAttempts, setFormMaxAttempts] = useState<number>(1);
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('published');
  const [formAttachmentName, setFormAttachmentName] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formAttachmentSize, setFormAttachmentSize] = useState('1.5 MB');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Tutor Submit Modal
  const [submittingAssignment, setSubmittingAssignment] = useState<Assignment | null>(null);
  const [submissionWritten, setSubmissionWritten] = useState('');
  const [submissionFileName, setSubmissionFileName] = useState('');
  const [submissionFileUrl, setSubmissionFileUrl] = useState('');
  const [submissionFileSize, setSubmissionFileSize] = useState('');
  const [isSavingSubmission, setIsSavingSubmission] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState<any>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // History & Inspection Drawer
  const [inspectingAssignment, setInspectingAssignment] = useState<Assignment | null>(null);
  const [inspectionSubmissions, setInspectionSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  // Admin Grading Modal
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradeInput, setGradeInput] = useState<string>('85');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Tutor submissions cache to show badges on cards
  const [tutorSubmissions, setTutorSubmissions] = useState<AssignmentSubmission[]>([]);

  useEffect(() => {
    if (!isAdmin && currentUser?.id) {
      LearningService.getSubmissions(undefined, currentUser.id).then(subs => {
        setTutorSubmissions(subs);
      });
    }
  }, [isAdmin, currentUser, assignments]);

  // Open Edit Form Modal
  const handleOpenCreateModal = (asg?: Assignment) => {
    if (asg) {
      setEditingAssignment(asg);
      setFormTitle(asg.title);
      setFormDescription(asg.description);
      setFormInstructions(asg.instructions || '');
      setFormTotalMarks(String(asg.total_marks));
      setFormDueDate(asg.due_date ? asg.due_date.split('T')[0] : '');
      setFormLatePolicy(asg.late_policy);
      setFormFormat(asg.submission_format);
      setFormMaxAttempts(asg.max_attempts);
      setFormStatus(asg.status === 'archived' ? 'draft' : asg.status);
      if (asg.attachments && asg.attachments[0]) {
        setFormAttachmentName(asg.attachments[0].name);
        setFormAttachmentUrl(asg.attachments[0].url);
        setFormAttachmentSize(asg.attachments[0].size || '1.5 MB');
      } else {
        setFormAttachmentName('');
        setFormAttachmentUrl('');
      }
    } else {
      setEditingAssignment(null);
      setFormTitle('');
      setFormDescription('');
      setFormInstructions('');
      setFormTotalMarks('100');
      // default 7 days from now
      const d = new Date(Date.now() + 7 * 86400000);
      setFormDueDate(d.toISOString().split('T')[0]);
      setFormLatePolicy('allow_with_penalty');
      setFormFormat('both');
      setFormMaxAttempts(1);
      setFormStatus('published');
      setFormAttachmentName('');
      setFormAttachmentUrl('');
    }
    setIsFormModalOpen(true);
  };

  // Save Assignment (Admin)
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Please enter an assignment title.');
      return;
    }
    setIsSubmittingForm(true);
    try {
      const attachments = formAttachmentName.trim()
        ? [
            {
              name: formAttachmentName.trim(),
              url: formAttachmentUrl.trim() || '#',
              size: formAttachmentSize.trim() || '1.5 MB',
              type: 'application/pdf',
            },
          ]
        : [];

      await LearningService.saveAssignment(
        {
          id: editingAssignment?.id,
          title: formTitle.trim(),
          description: formDescription.trim(),
          instructions: formInstructions.trim(),
          total_marks: Number(formTotalMarks) || 100,
          due_date: new Date(formDueDate || Date.now() + 7 * 86400000).toISOString(),
          late_policy: formLatePolicy,
          submission_format: formFormat,
          max_attempts: Number(formMaxAttempts),
          status: formStatus,
          attachments,
        },
        { id: currentUser.id, name: currentUser.full_name }
      );

      setIsFormModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save assignment.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Open Tutor Submission Modal
  const handleOpenSubmitModal = async (asg: Assignment) => {
    setSubmittingAssignment(asg);
    setSubmissionWritten('');
    setSubmissionFileName('');
    setSubmissionFileUrl('');
    setSubmissionFileSize('');
    setSubmissionError(null);

    const status = await LearningService.getAttemptStatus(asg.id, currentUser.id);
    setAttemptStatus(status);
  };

  // Submit Attempt (Tutor)
  const handleSubmitAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;

    if (submittingAssignment.submission_format === 'written' && !submissionWritten.trim()) {
      setSubmissionError('Written response is required for this assignment.');
      return;
    }
    if (submittingAssignment.submission_format === 'file' && !submissionFileName.trim()) {
      setSubmissionError('File attachment is required for this assignment.');
      return;
    }
    if (submittingAssignment.submission_format === 'both' && !submissionWritten.trim() && !submissionFileName.trim()) {
      setSubmissionError('Please provide either a written response or an attached file.');
      return;
    }

    setIsSavingSubmission(true);
    setSubmissionError(null);
    try {
      await LearningService.submitAssignmentAttempt({
        assignmentId: submittingAssignment.id,
        tutorId: currentUser.id,
        tutorName: currentUser.full_name || 'Fellowship Tutor',
        cellId: currentUser.cell_id,
        cellName: currentUser.cell_name,
        writtenResponse: submissionWritten.trim(),
        attachmentName: submissionFileName.trim() || undefined,
        attachmentUrl: submissionFileUrl.trim() || '#',
        attachmentSize: submissionFileSize || '1.2 MB',
      });

      setSubmittingAssignment(null);
      // Refresh local tutor submissions
      const subs = await LearningService.getSubmissions(undefined, currentUser.id);
      setTutorSubmissions(subs);
      onRefresh();
      alert('Your assignment attempt has been successfully submitted to leadership!');
    } catch (err: any) {
      setSubmissionError(err.message || 'Submission could not be completed.');
    } finally {
      setIsSavingSubmission(false);
    }
  };

  // Open Inspection / Submissions History Drawer
  const handleInspectSubmissions = async (asg: Assignment) => {
    setInspectingAssignment(asg);
    setIsLoadingSubmissions(true);
    try {
      const subs = await LearningService.getSubmissions(asg.id, isAdmin ? undefined : currentUser.id);
      setInspectionSubmissions(subs);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  // Save Grade (Admin)
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    setIsSubmittingGrade(true);
    try {
      await LearningService.gradeSubmission(
        gradingSubmission.id,
        Number(gradeInput) || 0,
        feedbackInput.trim(),
        currentUser.id,
        currentUser.full_name || 'Church Leadership',
        true // release grade
      );

      // Refresh drawer
      if (inspectingAssignment) {
        const subs = await LearningService.getSubmissions(inspectingAssignment.id);
        setInspectionSubmissions(subs);
      }
      setGradingSubmission(null);
      onRefresh();
      alert('Grade and feedback successfully published!');
    } catch (err: any) {
      alert(err.message || 'Failed to submit grade.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  // Filtered assignments
  const filteredAssignments = assignments.filter(asg => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = asg.title.toLowerCase().includes(q) || asg.description.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (isAdmin) {
      if (activeTabFilter === 'pending') return asg.status === 'draft';
      if (activeTabFilter === 'submitted') return asg.status === 'published';
      if (activeTabFilter === 'graded') return asg.status === 'archived';
      return true;
    } else {
      // Tutor Filter
      const mySubs = tutorSubmissions.filter(s => s.assignment_id === asg.id);
      const isSubmitted = mySubs.length > 0;
      const isGraded = mySubs.some(s => s.status === 'graded');

      if (activeTabFilter === 'pending') return !isSubmitted && asg.status === 'published';
      if (activeTabFilter === 'submitted') return isSubmitted && !isGraded;
      if (activeTabFilter === 'graded') return isGraded;
      return true;
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#142B4A] dark:text-white">
                Cell Leadership Assignments
              </h2>
              <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
                {isAdmin
                  ? 'Author, distribute, monitor attempt limits, and evaluate submissions.'
                  : 'Fulfill training assignments, review instructions, and track submissions.'}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#C6A45A]" />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white dark:bg-[#111c2d] p-3 rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[#F5F7FA] dark:bg-[#172437] p-1 rounded-xl text-xs font-bold text-[#667085]">
          <button
            onClick={() => setActiveTabFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTabFilter === 'all'
                ? 'bg-[#142B4A] text-white shadow-2xs'
                : 'hover:text-[#182230] dark:hover:text-white'
            }`}
          >
            All ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTabFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTabFilter === 'pending'
                ? 'bg-[#142B4A] text-white shadow-2xs'
                : 'hover:text-[#182230] dark:hover:text-white'
            }`}
          >
            {isAdmin ? 'Drafts' : 'To Do'}
          </button>
          <button
            onClick={() => setActiveTabFilter('submitted')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTabFilter === 'submitted'
                ? 'bg-[#142B4A] text-white shadow-2xs'
                : 'hover:text-[#182230] dark:hover:text-white'
            }`}
          >
            {isAdmin ? 'Published' : 'Submitted'}
          </button>
          <button
            onClick={() => setActiveTabFilter('graded')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTabFilter === 'graded'
                ? 'bg-[#142B4A] text-white shadow-2xs'
                : 'hover:text-[#182230] dark:hover:text-white'
            }`}
          >
            {isAdmin ? 'Archived' : 'Graded'}
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assignments..."
            className="w-full pl-3 pr-3 py-1.5 text-xs rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#111c2d] text-[#182230] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C6A45A]"
          />
        </div>
      </div>

      {/* 3. Assignments Card Grid */}
      {filteredAssignments.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d]">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
            No assignments found
          </h3>
          <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
            {isAdmin
              ? 'Click "Create Assignment" above to author and publish a new assignment for all active tutors.'
              : 'There are currently no assignments matching your active filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map(asg => {
            const mySubs = tutorSubmissions.filter(s => s.assignment_id === asg.id);
            const myLatestSub = mySubs.length > 0 ? mySubs[mySubs.length - 1] : null;
            const attemptsUsed = mySubs.length;
            const maxAttempts = asg.max_attempts;
            const remaining = maxAttempts === 0 ? 'Unlimited' : Math.max(0, maxAttempts - attemptsUsed);
            const canSubmit = maxAttempts === 0 || remaining === 'Unlimited' || (typeof remaining === 'number' && remaining > 0);

            const isPastDue = new Date().getTime() > new Date(asg.due_date).getTime();

            return (
              <div
                key={asg.id}
                className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        asg.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : asg.status === 'draft'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {asg.status}
                    </span>

                    <div className="flex items-center gap-1.5 text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        {asg.total_marks} Marks
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#F5F7FA] text-[#142B4A] dark:bg-[#172437] dark:text-slate-300 border border-[#E3E8EF] dark:border-[#26384d]">
                        {asg.max_attempts === 0 ? 'Unlimited Attempts' : `Max ${asg.max_attempts} Attempt${asg.max_attempts > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-base text-[#182230] dark:text-white leading-snug">
                    {asg.title}
                  </h3>
                  <p className="text-xs text-[#667085] dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {asg.description}
                  </p>

                  {/* Submission format & Instructions pill */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] text-[11px] text-[#667085]">
                    <span className="font-semibold text-[#142B4A] dark:text-slate-300">
                      Format:
                    </span>
                    <span className="capitalize px-2 py-0.5 rounded-md bg-[#F5F7FA] dark:bg-[#172437] font-medium">
                      {asg.submission_format === 'both' ? 'Written or File' : asg.submission_format}
                    </span>
                    <span>&bull;</span>
                    <span className="font-semibold text-[#142B4A] dark:text-slate-300">
                      Due:
                    </span>
                    <span className={isPastDue ? 'text-[#C74646] font-bold' : ''}>
                      {new Date(asg.due_date).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Attached files to download */}
                  {asg.attachments && asg.attachments.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#172437] border border-[#E3E8EF] dark:border-[#26384d] text-xs">
                      <div className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Download className="w-3 h-3 text-[#C6A45A]" />
                        <span>Supporting Material:</span>
                      </div>
                      <div className="space-y-1">
                        {asg.attachments.map((att, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs font-semibold text-[#142B4A] dark:text-slate-200">
                            <span className="truncate">{att.name}</span>
                            <span className="text-[10px] text-[#667085] ml-2 shrink-0">{att.size}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tutor Attempt Status Strip */}
                  {!isAdmin && (
                    <div className="mt-3.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs">
                      <div className="flex items-center justify-between font-bold text-[#142B4A] dark:text-white">
                        <span>Your Submission Status:</span>
                        {myLatestSub?.grade !== undefined ? (
                          <span className="text-emerald-700 font-black">
                            Grade: {myLatestSub.grade}/{asg.total_marks}
                          </span>
                        ) : myLatestSub ? (
                          <span className="text-amber-700 font-semibold">
                            Submitted &bull; Awaiting Review
                          </span>
                        ) : (
                          <span className="text-slate-500 font-normal">
                            Not Started
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#667085] dark:text-slate-400 mt-1">
                        <span>
                          Attempts Used: <strong className="text-[#142B4A] dark:text-white">{attemptsUsed}</strong>
                          {maxAttempts > 0 && ` of ${maxAttempts}`}
                        </span>
                        <span className={remaining === 0 ? 'text-[#C74646] font-bold' : 'text-emerald-700 font-semibold'}>
                          {remaining === 0 ? 'No attempts remaining' : `${remaining} attempt${remaining === 1 ? '' : 's'} remaining`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 pt-3.5 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between gap-2">
                  {isAdmin ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInspectSubmissions(asg)}
                          className="px-3 py-1.5 rounded-lg bg-[#F5F7FA] hover:bg-[#E3E8EF] text-[#142B4A] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>Submissions</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenCreateModal(asg)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#142B4A] hover:bg-slate-100 transition-colors"
                          title="Edit Assignment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Archive assignment "${asg.title}"?`)) {
                              await LearningService.archiveAssignment(asg.id);
                              onRefresh();
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Permanently delete assignment "${asg.title}"?`)) {
                              await LearningService.deleteAssignment(asg.id);
                              onRefresh();
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#C74646] hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {mySubs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleInspectSubmissions(asg)}
                          className="text-xs font-bold text-[#142B4A] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>History ({mySubs.length})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => handleOpenSubmitModal(asg)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto ${
                          canSubmit
                            ? 'bg-[#142B4A] text-white hover:bg-[#203D63] shadow-xs'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5 text-[#C6A45A]" />
                        <span>{mySubs.length > 0 ? `Submit New Attempt (#${attemptsUsed + 1})` : 'Submit Assignment'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ADMIN MODAL: CREATE / EDIT ASSIGNMENT                                    */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <h3 className="text-lg font-bold text-[#142B4A] dark:text-white">
                  {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
                </h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  General distribution to all active cell tutors across fellowships.
                </p>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 mt-4 text-xs">
              {/* Title */}
              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Cell Discipleship Multiplication Plan"
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Description & Context *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Explain the background, purpose and pastoral goals of this assignment..."
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                />
              </div>

              {/* Detailed Instructions */}
              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Step-by-Step Instructions
                </label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={e => setFormInstructions(e.target.value)}
                  placeholder="Step 1: Read the handbook&#10;Step 2: List your outreach dates&#10;Step 3: Upload your spreadsheet"
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                />
              </div>

              {/* Metrics & Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={formTotalMarks}
                    onChange={e => setFormTotalMarks(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Submission Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                  />
                </div>
              </div>

              {/* Late Submission Policy & Submission Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Late Submission Policy
                  </label>
                  <select
                    value={formLatePolicy}
                    onChange={e => setFormLatePolicy(e.target.value as LatePolicy)}
                    className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                  >
                    <option value="allow_with_penalty">Allow with late penalty flag</option>
                    <option value="allow_no_penalty">Allow without penalty</option>
                    <option value="reject_late">Strict cutoff (reject late submissions)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Submission Format
                  </label>
                  <select
                    value={formFormat}
                    onChange={e => setFormFormat(e.target.value as SubmissionFormat)}
                    className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                  >
                    <option value="both">Both (Written response and/or file)</option>
                    <option value="written">Written response only</option>
                    <option value="file">File upload only</option>
                  </select>
                </div>
              </div>

              {/* MAXIMUM SUBMISSION ATTEMPTS (Explicit Requirement from prompt) */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40">
                <div className="flex items-center gap-2 mb-2 font-black text-amber-900 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Maximum Submission Attempts</span>
                </div>
                <p className="text-[11px] text-[#667085] dark:text-slate-400 mb-3">
                  Admin decides how many attempts tutors can submit. Every submission version is preserved with timestamps.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { value: 1, label: '1 attempt' },
                    { value: 2, label: '2 attempts' },
                    { value: 3, label: '3 attempts' },
                    { value: 5, label: '5 attempts' },
                    { value: 0, label: 'Unlimited' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormMaxAttempts(opt.value)}
                      className={`py-2 px-3 rounded-xl font-bold text-center transition-all cursor-pointer ${
                        formMaxAttempts === opt.value
                          ? 'bg-[#142B4A] text-white shadow-2xs'
                          : 'bg-white dark:bg-[#111c2d] text-[#667085] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#E3E8EF] dark:border-[#26384d]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supporting Attachment */}
              <div className="p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#172437] border border-[#E3E8EF] dark:border-[#26384d] space-y-3">
                <label className="block font-bold text-[#142B4A] dark:text-slate-200">
                  Supporting Document / Attachment
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formAttachmentName}
                    onChange={e => setFormAttachmentName(e.target.value)}
                    placeholder="Attachment File Name (e.g. Framework.pdf)"
                    className="p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#111c2d] text-[#182230] dark:text-white"
                  />
                  <input
                    type="text"
                    value={formAttachmentUrl}
                    onChange={e => setFormAttachmentUrl(e.target.value)}
                    placeholder="URL or cloud storage path"
                    className="p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#111c2d] text-[#182230] dark:text-white"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#142B4A] dark:text-white">
                  <input
                    type="radio"
                    name="asgStatus"
                    checked={formStatus === 'published'}
                    onChange={() => setFormStatus('published')}
                    className="accent-[#C6A45A]"
                  />
                  <span>Publish Immediately (Available to all active tutors)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#667085]">
                  <input
                    type="radio"
                    name="asgStatus"
                    checked={formStatus === 'draft'}
                    onChange={() => setFormStatus('draft')}
                    className="accent-[#C6A45A]"
                  />
                  <span>Save as Draft</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isSubmittingForm ? 'Saving...' : editingAssignment ? 'Save Changes' : 'Publish Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TUTOR SUBMISSION MODAL (With attempt limit enforcement & history)      */}
      {/* ========================================================================= */}
      {submittingAssignment && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <span className="text-[10px] font-black uppercase text-[#C6A45A] tracking-wider">
                  Attempt #{attemptStatus?.usedAttempts ? attemptStatus.usedAttempts + 1 : 1}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#142B4A] dark:text-white mt-0.5">
                  Submit Assignment Response
                </h3>
              </div>
              <button
                onClick={() => setSubmittingAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attempt Limit Banner */}
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-xs">
              <div className="font-bold text-[#142B4A] dark:text-white flex items-center justify-between">
                <span>{submittingAssignment.title}</span>
                <span className="text-amber-800 dark:text-amber-300">
                  {attemptStatus?.remainingAttempts === 'Unlimited'
                    ? 'Unlimited Attempts'
                    : `${attemptStatus?.remainingAttempts} Attempt(s) Remaining`}
                </span>
              </div>
              <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-1">
                Attempt {attemptStatus?.usedAttempts + 1} of{' '}
                {submittingAssignment.max_attempts === 0 ? 'Unlimited' : submittingAssignment.max_attempts}. Every attempt is recorded and reviewed.
              </p>
            </div>

            {submissionError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#C74646] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submissionError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAttempt} className="space-y-4 mt-4 text-xs">
              {/* Written response */}
              {(submittingAssignment.submission_format === 'written' ||
                submittingAssignment.submission_format === 'both') && (
                <div>
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Written Answer / Ministry Synopsis {submittingAssignment.submission_format === 'written' && '*'}
                  </label>
                  <textarea
                    rows={6}
                    value={submissionWritten}
                    onChange={e => setSubmissionWritten(e.target.value)}
                    placeholder="Enter your written response, ministry strategy, or feedback..."
                    className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                  />
                </div>
              )}

              {/* File upload */}
              {(submittingAssignment.submission_format === 'file' ||
                submittingAssignment.submission_format === 'both') && (
                <div className="p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#172437] border border-[#E3E8EF] dark:border-[#26384d]">
                  <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-[#C6A45A]" />
                    <span>Upload Supporting File {submittingAssignment.submission_format === 'file' && '*'}</span>
                  </label>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={submissionFileName}
                      onChange={e => {
                        setSubmissionFileName(e.target.value);
                        if (!submissionFileSize) setSubmissionFileSize('1.4 MB');
                      }}
                      placeholder="File Name or Doc Title (e.g. FNI_Cell_Calendar_Smile.pdf)"
                      className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#111c2d] text-[#182230] dark:text-white"
                    />
                    <input
                      type="text"
                      value={submissionFileUrl}
                      onChange={e => setSubmissionFileUrl(e.target.value)}
                      placeholder="File Link / Cloud Storage URL (Optional)"
                      className="w-full p-2.5 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#111c2d] text-[#182230] dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between">
                <span className="text-[11px] text-[#667085]">
                  Submitted as <strong>{currentUser.full_name}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmittingAssignment(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSubmission}
                    className="px-5 py-2.5 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#C6A45A]" />
                    <span>{isSavingSubmission ? 'Submitting...' : 'Confirm Submission'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. INSPECTION / SUBMISSION HISTORY DRAWER                                  */}
      {/* ========================================================================= */}
      {inspectingAssignment && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-floating border border-[#E3E8EF] dark:border-[#26384d] my-8 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <span className="text-[10px] font-black uppercase text-[#C6A45A] tracking-wider">
                  Submission History & Grading
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#142B4A] dark:text-white">
                  {inspectingAssignment.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectingAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingSubmissions ? (
              <div className="py-12 text-center text-xs text-[#667085]">
                Loading submissions...
              </div>
            ) : inspectionSubmissions.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#667085] bg-[#F5F7FA] dark:bg-[#172437] rounded-2xl border border-dashed border-[#E3E8EF] dark:border-[#26384d]">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold">No submissions recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When active tutors submit their responses, each attempt will appear here with version tracking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {inspectionSubmissions.map((sub, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all ${
                        isLatest
                          ? 'bg-[#FDFCF7] dark:bg-[#172437] border-[#C6A45A]/40 shadow-2xs'
                          : 'bg-white dark:bg-[#111c2d] border-[#E3E8EF] dark:border-[#26384d]'
                      }`}
                    >
                      {/* Submission Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-[#142B4A] text-[#C6A45A] font-black text-xs flex items-center justify-center">
                            #{sub.attempt_number}
                          </span>
                          <div>
                            <span className="font-bold text-[#182230] dark:text-white">
                              {sub.tutor_name}
                            </span>
                            {sub.cell_name && (
                              <span className="text-[11px] text-[#667085] ml-2">
                                ({sub.cell_name})
                              </span>
                            )}
                          </div>
                          {isLatest && (
                            <span className="px-2 py-0.5 rounded-full bg-[#142B4A] text-white text-[9px] font-black uppercase">
                              Latest Version
                            </span>
                          )}
                          {sub.is_late && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#C74646] text-[9px] font-bold">
                              Late
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[#667085]">
                          {new Date(sub.submitted_at).toLocaleString()}
                        </div>
                      </div>

                      {/* Written content */}
                      {sub.written_response && (
                        <div className="p-3 rounded-xl bg-[#F5F7FA] dark:bg-[#172437]/60 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-[#E3E8EF] dark:border-[#26384d]">
                          {sub.written_response}
                        </div>
                      )}

                      {/* File attachment */}
                      {sub.attachment_name && (
                        <div className="flex items-center gap-2 text-xs text-[#142B4A] dark:text-slate-200 font-semibold">
                          <FileText className="w-4 h-4 text-[#C6A45A]" />
                          <span>Attached: {sub.attachment_name}</span>
                          {sub.attachment_size && (
                            <span className="text-[10px] text-[#667085]">({sub.attachment_size})</span>
                          )}
                        </div>
                      )}

                      {/* Feedback & Grading Section */}
                      <div className="pt-2 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-between flex-wrap gap-2">
                        <div>
                          {sub.grade !== undefined && sub.grade !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-black">
                                Grade: {sub.grade}/{inspectingAssignment.total_marks}
                              </span>
                              {sub.feedback && (
                                <span className="text-[11px] text-[#667085] italic truncate max-w-sm">
                                  "{sub.feedback}"
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 font-semibold">
                              Awaiting Grading
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setGradingSubmission(sub);
                              setGradeInput(sub.grade !== undefined ? String(sub.grade) : '85');
                              setFeedbackInput(sub.feedback || '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#C6A45A]" />
                            <span>{sub.grade !== undefined ? 'Edit Grade' : 'Grade Submission'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ADMIN GRADING & FEEDBACK MODAL                                         */}
      {/* ========================================================================= */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl max-w-md w-full p-6 shadow-floating border border-[#E3E8EF] dark:border-[#26384d]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF] dark:border-[#26384d]">
              <div>
                <h3 className="font-bold text-[#142B4A] dark:text-white">
                  Grade Submission #{gradingSubmission.attempt_number}
                </h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Tutor: {gradingSubmission.tutor_name}
                </p>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-[#182230]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Marks Awarded (out of {inspectingAssignment?.total_marks || 100}) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={inspectingAssignment?.total_marks || 100}
                  value={gradeInput}
                  onChange={e => setGradeInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-base font-bold text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Constructive Pastoral Feedback & Remarks
                </label>
                <textarea
                  rows={4}
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  placeholder="Commend good observations and highlight areas for spiritual or leadership growth..."
                  className="w-full p-3 rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-white dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
                />
              </div>

              <div className="pt-3 border-t border-[#E3E8EF] dark:border-[#26384d] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGrade}
                  className="px-5 py-2.5 rounded-xl bg-[#23845B] hover:bg-emerald-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingGrade ? 'Saving...' : 'Save & Release Grade'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
