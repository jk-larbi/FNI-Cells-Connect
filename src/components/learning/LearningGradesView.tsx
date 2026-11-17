import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Award,
  CheckCircle2,
  Download,
  Search,
  Filter,
  FileCheck,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Assignment, AssignmentSubmission, QuizAttempt } from '../../types/learning';
import { LearningService } from '../../services/learningService';

interface LearningGradesViewProps {
  assignments: Assignment[];
}

export const LearningGradesView: React.FC<LearningGradesViewProps> = ({ assignments }) => {
  const { currentUser, isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingItem, setInspectingItem] = useState<AssignmentSubmission | null>(null);

  useEffect(() => {
    loadGrades();
  }, [isAdmin, currentUser]);

  const loadGrades = async () => {
    setIsLoading(true);
    try {
      const [subs, atts] = await Promise.all([
        LearningService.getSubmissions(undefined, isAdmin ? undefined : currentUser.id),
        LearningService.getQuizAttempts(undefined, isAdmin ? undefined : currentUser.id),
      ]);
      setSubmissions(subs);
      setQuizAttempts(atts);
    } finally {
      setIsLoading(false);
    }
  };

  // Only graded submissions
  const gradedSubmissions = submissions.filter(s => s.grade !== undefined && s.grade !== null);

  // Filtered
  const filteredSubmissions = gradedSubmissions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const asg = assignments.find(a => a.id === s.assignment_id);
    return (
      s.tutor_name.toLowerCase().includes(q) ||
      (asg && asg.title.toLowerCase().includes(q)) ||
      (s.cell_name && s.cell_name.toLowerCase().includes(q))
    );
  });

  // Export CSV
  const handleExportCSV = () => {
    if (gradedSubmissions.length === 0) return;
    const headers = [
      'Tutor Name',
      'Cell Fellowship',
      'Assignment Title',
      'Attempt #',
      'Marks Awarded',
      'Total Possible',
      'Percentage',
      'Graded Date',
      'Feedback',
    ];
    const rows = gradedSubmissions.map(s => {
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
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `FNI_Learning_Grades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute Overall Averages
  const allGrades = gradedSubmissions.map(s => {
    const asg = assignments.find(a => a.id === s.assignment_id);
    const total = asg?.total_marks || 100;
    return Math.round(((s.grade || 0) / total) * 100);
  });

  const avgPercentage =
    allGrades.length > 0 ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length) : 0;
  const maxScore = allGrades.length > 0 ? Math.max(...allGrades) : 0;
  const minScore = allGrades.length > 0 ? Math.min(...allGrades) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#142B4A] dark:text-white">
              {isAdmin ? 'Grades & Academic Scores Directorate' : 'My Grades & Evaluated Submissions'}
            </h2>
            <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
              {isAdmin
                ? 'Central repository of all evaluated assignments, awarded marks, and feedback.'
                : 'Review pastoral remarks and marks awarded for your completed assignments.'}
            </p>
          </div>
        </div>

        {isAdmin && gradedSubmissions.length > 0 && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] text-xs font-bold text-[#142B4A] dark:text-white hover:bg-slate-50 transition-all flex items-center gap-2 shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Export Grades (CSV)</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
            Evaluated Submissions
          </span>
          <div className="text-2xl font-black text-[#142B4A] dark:text-white mt-1">
            {gradedSubmissions.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            Marks awarded
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
            Average Score
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {avgPercentage}%
          </div>
          <span className="text-[11px] text-[#667085] font-semibold mt-1 block">
            Across evaluations
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
            Top Score
          </span>
          <div className="text-2xl font-black text-[#C6A45A] mt-1">
            {maxScore}%
          </div>
          <span className="text-[11px] text-[#667085] font-semibold mt-1 block">
            Highest performance
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
            Completed Quizzes
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {quizAttempts.length}
          </div>
          <span className="text-[11px] text-[#667085] font-semibold mt-1 block">
            Auto-graded attempts
          </span>
        </div>
      </div>

      {/* Graded Submissions List */}
      <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E3E8EF] dark:border-[#26384d] flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-sm text-[#142B4A] dark:text-white">
            Evaluated Submissions Log ({filteredSubmissions.length})
          </h3>

          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by tutor or assignment..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] dark:border-[#26384d] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA] dark:bg-[#172437]">
                <th className="py-3 px-5">TUTOR & CELL</th>
                <th className="py-3 px-4">ASSIGNMENT</th>
                <th className="py-3 px-4">ATTEMPT</th>
                <th className="py-3 px-4">GRADE AWARDED</th>
                <th className="py-3 px-4">PASTORAL FEEDBACK</th>
                <th className="py-3 px-5 text-right">EVALUATION DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF] dark:divide-[#26384d]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#667085]">
                    Loading grade records...
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#667085]">
                    No evaluated submissions found.
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
                      onClick={() => setInspectingItem(sub)}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#172437] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-bold text-[#182230] dark:text-white">
                          {sub.tutor_name}
                        </div>
                        <div className="text-[11px] text-[#667085] mt-0.5">
                          {sub.cell_name}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#142B4A] dark:text-white">
                          {asg?.title || 'Assignment'}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#F5F7FA] dark:bg-[#172437] font-bold text-[11px]">
                          Attempt #{sub.attempt_number}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-emerald-600">
                            {sub.grade} / {total}
                          </span>
                          <span className="text-[11px] font-bold text-[#667085]">
                            ({pct}%)
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 max-w-xs truncate text-[11px] text-[#667085] italic">
                        {sub.feedback ? `"${sub.feedback}"` : 'No feedback entered'}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right text-[11px] text-[#667085]">
                        {sub.graded_at ? new Date(sub.graded_at).toLocaleDateString() : 'Recently'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
