import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Award,
  CheckCircle2,
  Download,
  Search,
  Filter,
  FileCheck2,
  Eye,
  MessageSquare,
  BookOpen,
  X,
  Clock,
  User,
  Building,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Assignment, AssignmentSubmission, QuizAttempt, Quiz } from '../../types/learning';
import { LearningService } from '../../services/learningService';

interface LearningGradesViewProps {
  assignments: Assignment[];
}

export const LearningGradesView: React.FC<LearningGradesViewProps> = ({ assignments }) => {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'assignments' | 'quizzes'>('assignments');
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cellFilter, setCellFilter] = useState('all');

  // Detail Modal Inspection
  const [inspectingSubmission, setInspectingSubmission] = useState<AssignmentSubmission | null>(null);
  const [inspectingQuizAttempt, setInspectingQuizAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    loadGrades();
  }, [isAdmin, currentUser]);

  const loadGrades = async () => {
    setIsLoading(true);
    try {
      const [subs, atts, qzs] = await Promise.all([
        LearningService.getSubmissions(undefined, isAdmin ? undefined : currentUser?.id),
        LearningService.getQuizAttempts(undefined, isAdmin ? undefined : currentUser?.id),
        LearningService.getQuizzes(isAdmin),
      ]);
      setSubmissions(subs || []);
      setQuizAttempts(atts || []);
      setQuizzes(qzs || []);
    } finally {
      setIsLoading(false);
    }
  };

  // Only graded submissions for tutors, or released results
  const visibleSubmissions = submissions.filter(s => {
    if (s.grade === undefined || s.grade === null) return false;
    if (!isAdmin && !s.results_released && s.status !== 'graded') return false;
    return true;
  });

  const visibleQuizAttempts = quizAttempts.filter(a => {
    if (!isAdmin && !a.results_released && a.status !== 'graded') return false;
    return true;
  });

  // Extract unique cells for filter
  const allCells = Array.from(
    new Set([
      ...visibleSubmissions.map(s => s.cell_name).filter(Boolean),
      ...visibleQuizAttempts.map(a => a.cell_name).filter(Boolean),
    ])
  ) as string[];

  // Filter Submissions
  const filteredSubmissions = visibleSubmissions.filter(s => {
    if (cellFilter !== 'all' && s.cell_name !== cellFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const asg = assignments.find(a => a.id === s.assignment_id);
    return (
      s.tutor_name.toLowerCase().includes(q) ||
      (asg && asg.title.toLowerCase().includes(q)) ||
      (s.cell_name && s.cell_name.toLowerCase().includes(q))
    );
  });

  // Filter Quiz Attempts
  const filteredQuizAttempts = visibleQuizAttempts.filter(a => {
    if (cellFilter !== 'all' && a.cell_name !== cellFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const qz = quizzes.find(item => item.id === a.quiz_id);
    return (
      a.tutor_name.toLowerCase().includes(q) ||
      (qz && qz.title.toLowerCase().includes(q)) ||
      (a.cell_name && a.cell_name.toLowerCase().includes(q))
    );
  });

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'assignments') {
      if (filteredSubmissions.length === 0) return;
      const headers = ['Tutor Name', 'Cell', 'Assignment Title', 'Attempt #', 'Marks', 'Total', 'Percentage', 'Graded Date', 'Feedback'];
      const rows = filteredSubmissions.map(s => {
        const asg = assignments.find(a => a.id === s.assignment_id);
        const total = asg?.total_marks || 100;
        const pct = Math.round(((s.grade || 0) / total) * 100);
        return [
          `"${s.tutor_name.replace(/"/g, '""')}"`,
          `"${(s.cell_name || '').replace(/"/g, '""')}"`,
          `"${(asg?.title || '').replace(/"/g, '""')}"`,
          s.attempt_number,
          s.grade || 0,
          total,
          `${pct}%`,
          s.graded_at ? new Date(s.graded_at).toLocaleDateString() : '',
          `"${(s.feedback || '').replace(/"/g, '""')}"`,
        ].join(',');
      });
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `FNI_Assignment_Grades_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (filteredQuizAttempts.length === 0) return;
      const headers = ['Tutor Name', 'Cell', 'Quiz Title', 'Attempt #', 'Score', 'Total Possible', 'Percentage', 'Status', 'Passed', 'Completed Date'];
      const rows = filteredQuizAttempts.map(a => {
        const qz = quizzes.find(item => item.id === a.quiz_id);
        return [
          `"${a.tutor_name.replace(/"/g, '""')}"`,
          `"${(a.cell_name || '').replace(/"/g, '""')}"`,
          `"${(qz?.title || a.quiz_title || '').replace(/"/g, '""')}"`,
          a.attempt_number || 1,
          a.score,
          a.total_possible,
          `${a.percentage}%`,
          a.status,
          a.passed ? 'Yes' : 'No',
          a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '',
        ].join(',');
      });
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `FNI_Quiz_Scores_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Metrics
  const avgAssignmentPct =
    visibleSubmissions.length > 0
      ? Math.round(
          visibleSubmissions.reduce((acc, s) => {
            const asg = assignments.find(a => a.id === s.assignment_id);
            const total = asg?.total_marks || 100;
            return acc + ((s.grade || 0) / total) * 100;
          }, 0) / visibleSubmissions.length
        )
      : 0;

  const avgQuizPct =
    visibleQuizAttempts.length > 0
      ? Math.round(
          visibleQuizAttempts.reduce((acc, a) => acc + (a.percentage || 0), 0) /
            visibleQuizAttempts.length
        )
      : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#142B4A] dark:text-white">
              {isAdmin ? 'Grades & Academic Scores Directorate' : 'My Grades & Evaluated Scores'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAdmin
                ? 'Institutional repository of all evaluated assignments, quiz scores, question marks, and pastoral feedback.'
                : 'Review your personal evaluated assignments, quiz scores, question breakdowns, and pastoral remarks.'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-2xl bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 text-xs font-bold text-[#142B4A] dark:text-white hover:bg-slate-50 transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Evaluated Assignments
          </span>
          <div className="text-2xl font-black text-[#142B4A] dark:text-white mt-1">
            {visibleSubmissions.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            {avgAssignmentPct}% average marks
          </span>
        </div>

        <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Evaluated Quizzes
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {visibleQuizAttempts.length}
          </div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
            {avgQuizPct}% average score
          </span>
        </div>

        <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Passing Quizzes
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {visibleQuizAttempts.filter(a => a.passed).length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            Met passing threshold
          </span>
        </div>

        <div className="p-4 rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-card">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Active Fellowships
          </span>
          <div className="text-2xl font-black text-[#C6A45A] mt-1">
            {allCells.length || 1}
          </div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
            Cells with recorded grades
          </span>
        </div>
      </div>

      {/* Tabs Switcher: Assignments vs Quizzes */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl fni-glass-panel border border-slate-200/80 dark:border-white/10 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'assignments'
              ? 'bg-[#142B4A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Assignment Marks ({filteredSubmissions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'quizzes'
              ? 'bg-[#142B4A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Quiz Scores ({filteredQuizAttempts.length})</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="fni-glass-card bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
              {activeTab === 'assignments' ? 'Evaluated Assignments Log' : 'Evaluated Quiz Attempts Log'}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cell Filter */}
            {allCells.length > 0 && (
              <select
                value={cellFilter}
                onChange={e => setCellFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="all">All Cells</option>
                {allCells.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tutor, cell, title..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none w-52 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="table-scroll-container">
          {activeTab === 'assignments' ? (
            /* ASSIGNMENTS TABLE */
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/80 dark:bg-slate-800/60">
                  <th className="py-3 px-5">TUTOR & CELL</th>
                  <th className="py-3 px-4">ASSIGNMENT</th>
                  <th className="py-3 px-4">ATTEMPT</th>
                  <th className="py-3 px-4">MARKS AWARDED</th>
                  <th className="py-3 px-4">FEEDBACK</th>
                  <th className="py-3 px-5 text-right">EVALUATED DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Loading grade records...
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No evaluated assignment submissions found.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map(sub => {
                    const asg = assignments.find(a => a.id === sub.assignment_id);
                    const total = asg?.total_marks || 100;
                    const pct = Math.round(((sub.grade || 0) / total) * 100);

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setInspectingSubmission(sub)}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {sub.tutor_name}
                          </div>
                          <div className="text-[11px] text-slate-500">{sub.cell_name || 'Cell Leader'}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#142B4A] dark:text-white">
                          {asg?.title || 'Assignment'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                            Attempt #{sub.attempt_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-black text-sm text-emerald-600">
                            {sub.grade} / {total}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 ml-1.5">
                            ({pct}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-[11px] text-slate-500 italic">
                          {sub.feedback ? `"${sub.feedback}"` : 'No written feedback'}
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap text-right text-[11px] text-slate-500">
                          {sub.graded_at ? new Date(sub.graded_at).toLocaleDateString() : 'Recently'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* QUIZZES TABLE */
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/80 dark:bg-slate-800/60">
                  <th className="py-3 px-5">TUTOR & CELL</th>
                  <th className="py-3 px-4">QUIZ TITLE</th>
                  <th className="py-3 px-4">SCORE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">RESULT</th>
                  <th className="py-3 px-5 text-right">COMPLETED DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Loading quiz scores...
                    </td>
                  </tr>
                ) : filteredQuizAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No evaluated quiz attempts found.
                    </td>
                  </tr>
                ) : (
                  filteredQuizAttempts.map(att => {
                    const qz = quizzes.find(item => item.id === att.quiz_id);
                    return (
                      <tr
                        key={att.id}
                        onClick={() => setInspectingQuizAttempt(att)}
                        className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {att.tutor_name}
                          </div>
                          <div className="text-[11px] text-slate-500">{att.cell_name || 'Cell Leader'}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#142B4A] dark:text-white">
                          {qz?.title || att.quiz_title || 'Quiz'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-black text-sm text-emerald-600">
                            {att.score} / {att.total_possible}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 ml-1.5">
                            ({att.percentage}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {att.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {att.passed ? 'Passed' : 'Needs Review'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap text-right text-[11px] text-slate-500">
                          {att.completed_at ? new Date(att.completed_at).toLocaleDateString() : 'Recently'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* INSPECTION MODAL: ASSIGNMENT SUBMISSION DETAIL */}
      {inspectingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/80 dark:border-white/10 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Evaluated Assignment Detail
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSubmission(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">
                Tutor: {inspectingSubmission.tutor_name} ({inspectingSubmission.cell_name || 'Cell Leader'})
              </p>
              <p className="text-slate-500">
                Attempt #{inspectingSubmission.attempt_number} • Submitted on {new Date(inspectingSubmission.submitted_at).toLocaleString()}
              </p>
              <p className="text-emerald-600 font-black text-sm pt-1">
                Score Awarded: {inspectingSubmission.grade} pts
              </p>
            </div>

            {inspectingSubmission.written_response && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Written Response
                </h4>
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap bg-white dark:bg-[#172437]">
                  {inspectingSubmission.written_response}
                </div>
              </div>
            )}

            {inspectingSubmission.attachment_name && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Uploaded Document
                </h4>
                <a
                  href={inspectingSubmission.attachment_url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{inspectingSubmission.attachment_name}</span>
                </a>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Pastoral Feedback & Remarks
              </h4>
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 italic">
                {inspectingSubmission.feedback || 'No pastoral feedback entered.'}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setInspectingSubmission(null)}
                className="px-4 py-2 rounded-2xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL: QUIZ ATTEMPT DETAIL */}
      {inspectingQuizAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/80 dark:border-white/10 max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#C6A45A]" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Quiz Score Breakdown
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingQuizAttempt(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-white">
                Tutor: {inspectingQuizAttempt.tutor_name} ({inspectingQuizAttempt.cell_name || 'Cell Leader'})
              </p>
              <p className="text-slate-500">
                Attempt #{inspectingQuizAttempt.attempt_number || 1} • Completed on {new Date(inspectingQuizAttempt.completed_at).toLocaleString()}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="font-black text-base text-emerald-600">
                  {inspectingQuizAttempt.score} / {inspectingQuizAttempt.total_possible} ({inspectingQuizAttempt.percentage}%)
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  inspectingQuizAttempt.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {inspectingQuizAttempt.passed ? 'Passed' : 'Needs Review'}
                </span>
              </div>
            </div>

            {/* Questions Grading Breakdown */}
            {inspectingQuizAttempt.question_grades && Object.keys(inspectingQuizAttempt.question_grades).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Individual Question Marks
                </h4>
                {Object.entries(inspectingQuizAttempt.question_grades).map(([qId, detail], idx) => (
                  <div key={qId} className="p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Q{idx + 1}. {detail.question_text}
                      </span>
                      <span className="font-black text-emerald-600 shrink-0">
                        {detail.points_awarded} / {detail.max_points} pts
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Answer:</strong> {String(detail.user_answer ?? 'No answer provided')}
                    </p>
                    {detail.feedback && (
                      <p className="text-amber-800 dark:text-amber-300 italic pt-0.5">
                        Feedback: {detail.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setInspectingQuizAttempt(null)}
                className="px-4 py-2 rounded-2xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
