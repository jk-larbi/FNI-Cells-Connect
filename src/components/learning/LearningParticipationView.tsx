import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Award,
  Filter,
  FileCheck2,
  BookOpen,
  Phone,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TutorParticipationMetric, ParticipationStatus } from '../../types/learning';
import { LearningService } from '../../services/learningService';
import { SupabaseService } from '../../services/supabaseService';

export const LearningParticipationView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<TutorParticipationMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadParticipation();
  }, []);

  const loadParticipation = async () => {
    setIsLoading(true);
    try {
      const profiles = (await SupabaseService.getProfiles()) || [];
      const data = await LearningService.getParticipationMetrics(profiles);
      setMetrics(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Tutor's personal metric
  const myMetric = metrics.find(m => m.tutor_id === currentUser.id);

  // Filtered metrics for Admin
  const filteredMetrics = metrics.filter(m => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        m.tutor_name.toLowerCase().includes(q) ||
        (m.cell_name && m.cell_name.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (statusFilter !== 'all' && m.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Aggregated KPI Stats
  const totalTutors = metrics.length;
  const activeTutorsCount = metrics.filter(m => m.participation_rate > 0).length;
  const overallAvgScore =
    totalTutors > 0
      ? Math.round(metrics.reduce((acc, m) => acc + m.average_score, 0) / totalTutors)
      : 0;
  const overallAvgRate =
    totalTutors > 0
      ? Math.round(metrics.reduce((acc, m) => acc + m.participation_rate, 0) / totalTutors)
      : 0;

  const getStatusBadge = (status: ParticipationStatus) => {
    switch (status) {
      case 'Graded':
      case 'Quiz completed':
      case 'Submitted':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200';
      case 'In progress':
      case 'Awaiting grading':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200';
      case 'Submitted late':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200';
      case 'Missed':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#142B4A] dark:text-white">
            {isAdmin ? 'Tutor Participation Directorate' : 'My Learning Participation & Compliance'}
          </h2>
          <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'Institutional oversight of tutor engagement, assignment submissions, and quiz completion.'
              : 'Track your personal compliance with FNI leadership training requirements.'}
          </p>
        </div>
      </div>

      {/* Admin KPI Summary */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
              Total Active Tutors
            </span>
            <div className="text-2xl font-black text-[#142B4A] dark:text-white mt-1">
              {totalTutors}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              Across all fellowship cells
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
              Engaged Tutors
            </span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {activeTutorsCount}
            </div>
            <span className="text-[11px] text-[#667085] font-semibold mt-1 block">
              Submitted tasks or quizzes
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
              Avg Compliance Rate
            </span>
            <div className="text-2xl font-black text-[#C6A45A] mt-1">
              {overallAvgRate}%
            </div>
            <span className="text-[11px] text-[#667085] font-semibold mt-1 block">
              Overall training progress
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs">
            <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
              Avg Grade
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {overallAvgScore}%
            </div>
            <span className="text-[11px] text-[#667085] font-semibold mt-1 block">
              Performance standing
            </span>
          </div>
        </div>
      )}

      {/* Tutor Personal Card */}
      {!isAdmin && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800/40 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 tracking-wider">
                Personal Training Standing
              </span>
              <h3 className="text-lg font-black text-[#142B4A] dark:text-white mt-1">
                {currentUser.full_name} &bull; {currentUser.cell_name || 'Assigned Cell'}
              </h3>
              <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
                Keep up the momentum in expanding your spiritual and administrative capacity!
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-3xl font-black text-blue-600">
                {myMetric?.participation_rate || 0}%
              </span>
              <span className="block text-[11px] font-bold text-[#667085]">
                Overall Completion Rate
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-blue-200/60 dark:border-blue-800/30 text-xs">
            <div>
              <span className="text-[#667085]">Assignments Completed</span>
              <div className="font-black text-sm text-[#142B4A] dark:text-white mt-0.5">
                {myMetric?.assignments_submitted || 0} / {myMetric?.assignments_total || 0}
              </div>
            </div>
            <div>
              <span className="text-[#667085]">Quizzes Taken</span>
              <div className="font-black text-sm text-[#142B4A] dark:text-white mt-0.5">
                {myMetric?.quizzes_completed || 0} / {myMetric?.quizzes_total || 0}
              </div>
            </div>
            <div>
              <span className="text-[#667085]">Average Grade</span>
              <div className="font-black text-sm text-emerald-600 mt-0.5">
                {myMetric?.average_score || 0}%
              </div>
            </div>
            <div>
              <span className="text-[#667085]">Overall Status</span>
              <div className="font-bold text-xs mt-0.5">
                <span className={`px-2 py-0.5 rounded-full border ${getStatusBadge(myMetric?.status || 'Not started')}`}>
                  {myMetric?.status || 'Not started'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Table View */}
      {isAdmin && (
        <div className="bg-white dark:bg-[#111c2d] rounded-2xl border border-[#E3E8EF] dark:border-[#26384d] shadow-2xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-[#E3E8EF] dark:border-[#26384d] flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tutor by name or fellowship cell..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E3E8EF] dark:border-[#26384d] bg-[#F5F7FA] dark:bg-[#172437] text-[#182230] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C6A45A]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-[#667085] uppercase mr-1">Status:</span>
              {['all', 'Graded', 'In progress', 'Not started'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#142B4A] text-white shadow-2xs'
                      : 'bg-[#F5F7FA] dark:bg-[#172437] text-[#667085] hover:text-[#182230]'
                  }`}
                >
                  {st === 'all' ? 'All Tutors' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="table-scroll-container">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E3E8EF] dark:border-[#26384d] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA] dark:bg-[#172437]">
                  <th className="py-3 px-5">TUTOR & CELL</th>
                  <th className="py-3 px-4">ASSIGNMENTS</th>
                  <th className="py-3 px-4">QUIZZES</th>
                  <th className="py-3 px-4">COMPLETION RATE</th>
                  <th className="py-3 px-4">AVG GRADE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-5 text-right">LAST ACTIVE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EF] dark:divide-[#26384d]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#667085]">
                      Loading participation records...
                    </td>
                  </tr>
                ) : filteredMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#667085]">
                      No active tutors found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredMetrics.map(tutor => (
                    <tr
                      key={tutor.tutor_id}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#172437] transition-colors"
                    >
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="font-bold text-[#182230] dark:text-white">
                          {tutor.tutor_name}
                        </div>
                        <div className="text-[11px] text-[#667085] mt-0.5 flex items-center gap-2">
                          <span>{tutor.cell_name}</span>
                          {tutor.phone && <span>&bull; {tutor.phone}</span>}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#142B4A] dark:text-white">
                          {tutor.assignments_submitted}
                        </span>
                        <span className="text-[#667085]"> / {tutor.assignments_total}</span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#142B4A] dark:text-white">
                          {tutor.quizzes_completed}
                        </span>
                        <span className="text-[#667085]"> / {tutor.quizzes_total}</span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${tutor.participation_rate}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#142B4A] dark:text-white">
                            {tutor.participation_rate}%
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-black text-emerald-600">
                          {tutor.average_score}%
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getStatusBadge(
                            tutor.status
                          )}`}
                        >
                          {tutor.status}
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right text-[11px] text-[#667085]">
                        {tutor.last_activity_date
                          ? new Date(tutor.last_activity_date).toLocaleDateString()
                          : 'No activity'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
