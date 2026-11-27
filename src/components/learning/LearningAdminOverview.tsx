import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  Search,
  Send,
  Users,
} from 'lucide-react';
import {
  Assignment,
  AssignmentSubmission,
  LearningEvent,
  LearningPortalSection,
  Quiz,
  QuizAttempt,
} from '../../types/learning';
import './learningAdminOverview.css';

interface LearningAdminOverviewProps {
  assignments: Assignment[];
  quizzes: Quiz[];
  events: LearningEvent[];
  submissions: AssignmentSubmission[];
  quizAttempts: QuizAttempt[];
  activeTutorsCount: number;
  onNavigateSection: (section: LearningPortalSection) => void;
}

type ParticipantRow = {
  id: string;
  name: string;
  cell: string;
  submissions: number;
  quizzes: number;
  scores: number[];
  average: number | null;
  participation: number;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const average = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

const StatusPill: React.FC<{ value: string }> = ({ value }) => {
  const normalized = value.toLowerCase();
  const tone = normalized.includes('graded') || normalized.includes('published') || normalized.includes('passed')
    ? 'success'
    : normalized.includes('late') || normalized.includes('awaiting') || normalized.includes('pending')
      ? 'warning'
      : normalized.includes('draft') || normalized.includes('closed')
        ? 'neutral'
        : 'info';
  return <span className={`fni-la-status is-${tone}`}>{value}</span>;
};

const EmptyState: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="fni-la-empty">
    <span className="fni-la-empty-icon"><FileText className="h-5 w-5" /></span>
    <strong>{title}</strong>
    <p>{detail}</p>
  </div>
);

export const LearningAdminOverview: React.FC<LearningAdminOverviewProps> = ({
  assignments,
  quizzes,
  events,
  submissions,
  quizAttempts,
  activeTutorsCount,
  onNavigateSection,
}) => {
  const [dateRange, setDateRange] = useState<'all' | '30' | '90'>('all');
  const [trendCadence, setTrendCadence] = useState<'weekly' | 'monthly'>('weekly');
  const [participantQuery, setParticipantQuery] = useState('');
  const [cellFilter, setCellFilter] = useState('all');
  const [participantSort, setParticipantSort] = useState<'participation' | 'score' | 'name'>('participation');
  const [reportType, setReportType] = useState<'all' | 'assignments' | 'quizzes'>('all');

  const publishedAssignments = assignments.filter(item => item.status === 'published');
  const publishedQuizzes = quizzes.filter(item => item.status === 'published');
  const upcomingEvents = events.filter(item => item.status === 'upcoming');
  const pendingSubmissions = submissions.filter(item =>
    item.status === 'submitted' || item.status === 'submitted_late' || item.status === 'awaiting_grading'
  );
  const pendingQuizReviews = quizAttempts.filter(item =>
    item.status === 'awaiting_grading' || item.grading_status === 'awaiting_grading'
  );

  const cutoff = dateRange === 'all' ? null : Date.now() - Number(dateRange) * 24 * 60 * 60 * 1000;
  const rangeSubmissions = submissions.filter(item => {
    if (!cutoff) return true;
    const time = new Date(item.submitted_at).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });
  const rangeAttempts = quizAttempts.filter(item => {
    if (!cutoff) return true;
    const time = new Date(item.completed_at).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });

  const gradedAssignmentScores = rangeSubmissions
    .filter(item => item.grade !== undefined && item.grade !== null)
    .map(item => {
      const assessment = assignments.find(row => row.id === item.assignment_id);
      return assessment?.total_marks
        ? Math.round((Number(item.grade) / assessment.total_marks) * 100)
        : Number(item.grade);
    })
    .filter(value => Number.isFinite(value));
  const gradedQuizScores = rangeAttempts
    .filter(item => item.status === 'graded' || item.results_released)
    .map(item => Number(item.percentage))
    .filter(value => Number.isFinite(value));
  const gradedScores = [...gradedAssignmentScores, ...gradedQuizScores];
  const averageScore = average(gradedScores);
  const uniqueParticipants = new Set([
    ...rangeSubmissions.map(item => item.tutor_id),
    ...rangeAttempts.map(item => item.tutor_id),
  ]).size;
  const participationRate = activeTutorsCount > 0
    ? Math.min(100, Math.round((uniqueParticipants / activeTutorsCount) * 100))
    : null;
  const completedTaskKeys = new Set([
    ...rangeSubmissions.map(item => `${item.tutor_id}:assignment:${item.assignment_id}`),
    ...rangeAttempts
      .filter(item => !['not_started', 'in_progress'].includes(item.status))
      .map(item => `${item.tutor_id}:quiz:${item.quiz_id}`),
  ]);
  const completedCount = completedTaskKeys.size;
  const expectedTaskCount = activeTutorsCount * (publishedAssignments.length + publishedQuizzes.length);
  const pendingSubmissionCount = Math.max(0, expectedTaskCount - completedCount);
  const gradedQuizAttempts = rangeAttempts.filter(item => item.status === 'graded' || item.results_released);
  const passRate = gradedQuizAttempts.length
    ? Math.round((gradedQuizAttempts.filter(item => item.passed).length / gradedQuizAttempts.length) * 100)
    : null;
  const completionRate = expectedTaskCount > 0
    ? Math.min(100, Math.round((completedCount / expectedTaskCount) * 100))
    : null;

  const deadlines = [
    ...publishedAssignments.map(item => ({ id: item.id, title: item.title, type: 'Assignment', due: item.due_date })),
    ...publishedQuizzes.map(item => ({ id: item.id, title: item.title, type: 'Quiz', due: item.due_date })),
  ].filter(item => {
    const time = new Date(item.due).getTime();
    return Number.isFinite(time) && time >= Date.now();
  }).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  const overdueCount = [
    ...publishedAssignments,
    ...publishedQuizzes,
  ].filter(item => {
    const time = new Date(item.due_date).getTime();
    return Number.isFinite(time) && time < Date.now();
  }).length;

  const participants = useMemo<ParticipantRow[]>(() => {
    const map = new Map<string, ParticipantRow>();
    const ensure = (id: string, name: string, cell?: string) => {
      const key = id || name;
      let row = map.get(key);
      if (!row) {
        row = { id: key, name: name || 'FNI Member', cell: cell || 'Unassigned', submissions: 0, quizzes: 0, scores: [], average: null, participation: 0 };
        map.set(key, row);
      }
      if (cell) row.cell = cell;
      return row;
    };
    rangeSubmissions.forEach(item => {
      const row = ensure(item.tutor_id, item.tutor_name, item.cell_name);
      row.submissions += 1;
      if (item.grade !== undefined && item.grade !== null) {
        const assessment = assignments.find(entry => entry.id === item.assignment_id);
        row.scores.push(assessment?.total_marks ? Math.round((Number(item.grade) / assessment.total_marks) * 100) : Number(item.grade));
      }
    });
    rangeAttempts.forEach(item => {
      const row = ensure(item.tutor_id, item.tutor_name, item.cell_name);
      row.quizzes += 1;
      if (item.status === 'graded' || item.results_released) row.scores.push(Number(item.percentage));
    });
    return [...map.values()].map(row => {
      const taskCount = row.submissions + row.quizzes;
      return { ...row, average: average(row.scores), participation: activeTutorsCount > 0 ? Math.min(100, Math.round((taskCount / Math.max(1, publishedAssignments.length + publishedQuizzes.length)) * 100)) : 0 };
    });
  }, [rangeSubmissions, rangeAttempts, assignments, activeTutorsCount, publishedAssignments.length, publishedQuizzes.length]);

  const cells = useMemo(() => {
    const map = new Map<string, { name: string; participants: Set<string>; scores: number[]; submissions: number }>();
    const ensure = (name?: string, id?: string) => {
      const key = name || 'Unassigned';
      let row = map.get(key);
      if (!row) {
        row = { name: key, participants: new Set<string>(), scores: [], submissions: 0 };
        map.set(key, row);
      }
      if (id) row.participants.add(id);
      return row;
    };
    rangeSubmissions.forEach(item => {
      const row = ensure(item.cell_name, item.tutor_id);
      row.submissions += 1;
      if (item.grade !== undefined && item.grade !== null) {
        const assessment = assignments.find(entry => entry.id === item.assignment_id);
        row.scores.push(assessment?.total_marks ? Math.round((Number(item.grade) / assessment.total_marks) * 100) : Number(item.grade));
      }
    });
    rangeAttempts.forEach(item => {
      const row = ensure(item.cell_name, item.tutor_id);
      if (item.status === 'graded' || item.results_released) row.scores.push(Number(item.percentage));
    });
    return [...map.values()].map(row => ({ ...row, average: average(row.scores) })).sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  }, [rangeSubmissions, rangeAttempts, assignments]);

  const cellNames = [...new Set(participants.map(row => row.cell))].sort();
  const filteredParticipants = participants
    .filter(row => row.name.toLowerCase().includes(participantQuery.toLowerCase()) || row.cell.toLowerCase().includes(participantQuery.toLowerCase()))
    .filter(row => cellFilter === 'all' || row.cell === cellFilter)
    .sort((a, b) => participantSort === 'name'
      ? a.name.localeCompare(b.name)
      : participantSort === 'score'
        ? (b.average ?? -1) - (a.average ?? -1)
        : b.participation - a.participation);

  const scoreBands = [
    { label: 'Excellent', range: '90–100%', count: gradedScores.filter(value => value >= 90).length },
    { label: 'Good', range: '80–89%', count: gradedScores.filter(value => value >= 80 && value < 90).length },
    { label: 'Average', range: '70–79%', count: gradedScores.filter(value => value >= 70 && value < 80).length },
    { label: 'Below average', range: '50–69%', count: gradedScores.filter(value => value >= 50 && value < 70).length },
    { label: 'Failed', range: 'Below 50%', count: gradedScores.filter(value => value < 50).length },
  ];
  const maxBand = Math.max(1, ...scoreBands.map(item => item.count));
  const trendRecords = [
    ...rangeSubmissions.filter(item => item.grade !== undefined && item.grade !== null).map(item => {
      const assessment = assignments.find(row => row.id === item.assignment_id);
      return { date: item.submitted_at, score: assessment?.total_marks ? Math.round((Number(item.grade) / assessment.total_marks) * 100) : Number(item.grade) };
    }),
    ...gradedQuizAttempts.map(item => ({ date: item.completed_at, score: Number(item.percentage) })),
  ].filter(item => Number.isFinite(new Date(item.date).getTime()) && Number.isFinite(item.score));
  const trendBuckets = Array.from({ length: trendCadence === 'weekly' ? 8 : 6 }, (_, index) => {
    const date = new Date();
    if (trendCadence === 'weekly') {
      const day = (date.getDay() + 6) % 7;
      date.setDate(date.getDate() - day - (7 * (7 - index)));
      date.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setDate(end.getDate() + 7);
      return { key: date.toISOString().slice(0, 10), label: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), start: date.getTime(), end: end.getTime() };
    }
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const end = new Date(date); end.setMonth(end.getMonth() + 1);
    return { key: date.toISOString().slice(0, 7), label: date.toLocaleDateString('en-GB', { month: 'short' }), start: date.getTime(), end: end.getTime() };
  }).map(bucket => {
    const scores = trendRecords.filter(item => {
      const time = new Date(item.date).getTime();
      return time >= bucket.start && time < bucket.end;
    }).map(item => item.score);
    return { ...bucket, score: average(scores), count: scores.length };
  });

  const handleExport = () => {
    const rows = reportType === 'quizzes'
      ? rangeAttempts.map(item => [item.tutor_name, item.cell_name || '', item.quiz_title || 'Quiz', item.percentage, item.status, item.completed_at])
      : reportType === 'assignments'
        ? rangeSubmissions.map(item => [item.tutor_name, item.cell_name || '', assignments.find(row => row.id === item.assignment_id)?.title || 'Assignment', item.grade ?? '', item.status, item.submitted_at])
        : [
            ...rangeSubmissions.map(item => [item.tutor_name, item.cell_name || '', assignments.find(row => row.id === item.assignment_id)?.title || 'Assignment', item.grade ?? '', item.status, item.submitted_at]),
            ...rangeAttempts.map(item => [item.tutor_name, item.cell_name || '', item.quiz_title || 'Quiz', item.percentage, item.status, item.completed_at]),
          ];
    const header = ['Participant', 'Cell', 'Assessment', 'Score', 'Status', 'Date'];
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `fni-learning-${reportType}-report.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { label: 'Total Assessments', value: assignments.length + quizzes.length, detail: 'Quizzes & assignments' },
    { label: 'Total Participants', value: uniqueParticipants, detail: 'Unique members in selected period' },
    { label: 'Completed', value: completedCount, detail: 'Submitted assessments' },
    { label: 'Pending Submissions', value: pendingSubmissionCount, detail: 'Yet to submit' },
    { label: 'Average Score', value: averageScore === null ? '—' : `${averageScore}%`, detail: 'Graded assessments only' },
    { label: 'Pass Rate', value: passRate === null ? '—' : `${passRate}%`, detail: 'Met configured quiz threshold' },
  ];

  const alerts = [
    ...(pendingSubmissions.length + pendingQuizReviews.length > 0 ? [{
      title: 'Submissions awaiting review',
      detail: `${pendingSubmissions.length + pendingQuizReviews.length} assessment record(s) need grading`,
      action: () => onNavigateSection('grades' as LearningPortalSection),
      label: 'Review',
      tone: 'warning',
    }] : []),
    ...(overdueCount > 0 ? [{
      title: 'Past-due assessments',
      detail: `${overdueCount} published assessment(s) are past their due date`,
      action: () => onNavigateSection('assignments' as LearningPortalSection),
      label: 'View',
      tone: 'warning',
    }] : []),
    ...(deadlines.length > 0 ? [{
      title: 'Upcoming closing dates',
      detail: `${deadlines.length} published assessment(s) have future due dates`,
      action: () => onNavigateSection('assignments' as LearningPortalSection),
      label: 'View',
      tone: 'info',
    }] : []),
  ];

  return (
    <div className="fni-learning-admin-overview">
      <header className="fni-la-heading">
        <div>
          <p className="fni-la-eyebrow">ADMINISTRATION WORKSPACE</p>
          <h1>Learning &amp; Assessment</h1>
          <p>Monitor assessments, participation and learning performance across the ministry.</p>
        </div>
        <div className="fni-la-heading-actions">
          <label className="fni-la-range-label" htmlFor="fni-la-range">Reporting period</label>
          <select id="fni-la-range" value={dateRange} onChange={event => setDateRange(event.target.value as 'all' | '30' | '90')}>
            <option value="all">All records</option>
            <option value="90">Last 90 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <button type="button" className="fni-la-primary-action" onClick={() => onNavigateSection('quizzes')}>
            <FileCheck2 className="h-4 w-4" /> New quiz
          </button>
          <button type="button" className="fni-la-primary-action" onClick={() => onNavigateSection('assignments')}>
            <BookOpen className="h-4 w-4" /> New assignment
          </button>
        </div>
      </header>

      <section className="fni-la-kpis" aria-label="Learning KPIs">
        {kpis.map(item => (
          <article className={`fni-la-kpi ${item.label === 'Pending Submissions' ? 'is-highlighted' : ''}`} key={item.label}>
            <span className="fni-la-kpi-label">{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <section className="fni-la-alerts" aria-label="Administrative Alerts">
        <div className="fni-la-section-heading">
          <div><span className="fni-la-heading-icon"><Bell className="h-4 w-4" /></span><div><h2>Administrative Alerts &amp; Notifications</h2><p>Items requiring attention from the learning administration team.</p></div></div>
        </div>
        {alerts.length ? (
          <div className="fni-la-alert-list">
            {alerts.map(item => (
              <div className={`fni-la-alert is-${item.tone}`} key={item.title}>
                <span className="fni-la-alert-dot" />
                <div><strong>{item.title}</strong><p>{item.detail}</p></div>
                <button type="button" onClick={item.action}>{item.label}<ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No administrative alerts" detail="There are no pending grading items or overdue assessments in the current records." />
        )}
      </section>

      <section className="fni-la-analytics" aria-label="Performance Analytics">
        <div className="fni-la-section-heading">
          <div><span className="fni-la-heading-icon"><BarChart3 className="h-4 w-4" /></span><div><h2>Performance Analytics</h2><p>Score distribution (excluding ungraded), average performance, participation rates and assessment trends.</p></div></div>
          <div className="fni-la-cadence" role="tablist" aria-label="Performance trend cadence">
            <button type="button" role="tab" aria-selected={trendCadence === 'weekly'} className={trendCadence === 'weekly' ? 'is-active' : ''} onClick={() => setTrendCadence('weekly')}>Weekly</button>
            <button type="button" role="tab" aria-selected={trendCadence === 'monthly'} className={trendCadence === 'monthly' ? 'is-active' : ''} onClick={() => setTrendCadence('monthly')}>Monthly</button>
          </div>
        </div>
        <div className="fni-la-analytics-grid">
          <div className="fni-la-chart-card">
            <h3>Score Distribution</h3>
            {gradedScores.length ? (
              <div className="fni-la-score-bands">
                {scoreBands.map(item => (
                  <div className="fni-la-score-band" key={item.label}>
                    <span className={`fni-la-band-label band-${item.label.toLowerCase().replace(/\s/g, '-')}`}>{item.label}<small>{item.range}</small></span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No graded assessment history" detail="Ungraded submissions are tracked separately from failed assessments." />
            )}
          </div>
          <div className="fni-la-trend-card">
            <div className="fni-la-trend-summary">
              <div><span>Avg Quiz Score</span><strong>{average(gradedQuizScores) === null ? '—' : `${average(gradedQuizScores)}%`}</strong></div>
              <div><span>Avg Assignment</span><strong>{average(gradedAssignmentScores) === null ? '—' : `${average(gradedAssignmentScores)}%`}</strong></div>
              <div><span>Completion Rate</span><strong>{completionRate === null ? '—' : `${completionRate}%`}</strong></div>
            </div>
            {trendRecords.length ? (
              <div className="fni-la-trend-bars" role="img" aria-label={`${trendCadence} average assessment score trend`}>
                {trendBuckets.map(bucket => <div key={bucket.key}><span style={{ height: bucket.score === null ? '2px' : `${Math.max(3, bucket.score)}%` }} /><small>{bucket.label}</small></div>)}
              </div>
            ) : <EmptyState title="No graded assessment history synced yet" detail="Weekly and monthly trends appear as graded results are recorded." />}
          </div>
        </div>
      </section>

      <section className="fni-la-management-grid">
        <article className="fni-la-panel" aria-label="Quiz Management">
          <div className="fni-la-section-heading"><div><span className="fni-la-heading-icon"><FileCheck2 className="h-4 w-4" /></span><div><h2>Quiz Management</h2><p>Published quizzes and attempt activity.</p></div></div><button type="button" className="fni-la-text-action" onClick={() => onNavigateSection('quizzes')}>View all<ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          {quizzes.length ? (
            <div className="fni-la-table-wrap"><table><thead><tr><th>Quiz title</th><th>Status</th><th>Attempts</th><th>Due date</th></tr></thead><tbody>
              {quizzes.slice(0, 5).map(item => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.total_points} points</small></td><td><StatusPill value={item.status} /></td><td>{item.attempt_count ?? quizAttempts.filter(attempt => attempt.quiz_id === item.id).length}</td><td>{formatDate(item.due_date)}</td></tr>)}
            </tbody></table></div>
          ) : <EmptyState title="No quizzes created yet" detail="Create a quiz to begin tracking assessment participation." />}
          <button type="button" className="fni-la-panel-footer" onClick={() => onNavigateSection('quizzes')}>Open quiz management<ChevronRight className="h-4 w-4" /></button>
        </article>

        <article className="fni-la-panel" aria-label="Assignment Management">
          <div className="fni-la-section-heading"><div><span className="fni-la-heading-icon"><BookOpen className="h-4 w-4" /></span><div><h2>Assignment Management</h2><p>Assignment publication and submissions.</p></div></div><button type="button" className="fni-la-text-action" onClick={() => onNavigateSection('assignments')}>View all<ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          {assignments.length ? (
            <div className="fni-la-table-wrap"><table><thead><tr><th>Assignment title</th><th>Status</th><th>Submitted</th><th>Due date</th></tr></thead><tbody>
              {assignments.slice(0, 5).map(item => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.total_marks} marks</small></td><td><StatusPill value={item.status} /></td><td>{item.submission_count ?? submissions.filter(sub => sub.assignment_id === item.id).length}</td><td>{formatDate(item.due_date)}</td></tr>)}
            </tbody></table></div>
          ) : <EmptyState title="No assignments created yet" detail="Create an assignment to begin receiving tutor submissions." />}
          <button type="button" className="fni-la-panel-footer" onClick={() => onNavigateSection('assignments')}>Open assignment management<ChevronRight className="h-4 w-4" /></button>
        </article>
      </section>

      <section className="fni-la-participants-grid">
        <article className="fni-la-panel" aria-label="Participant Performance">
          <div className="fni-la-section-heading"><div><span className="fni-la-heading-icon"><Users className="h-4 w-4" /></span><div><h2>Participant Performance</h2><p>Participation and graded outcomes by member.</p></div></div><button type="button" className="fni-la-text-action" onClick={() => onNavigateSection('participation')}>Participation<ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          <div className="fni-la-filters">
            <label><Search className="h-4 w-4" /><input type="search" value={participantQuery} onChange={event => setParticipantQuery(event.target.value)} placeholder="Search participant…" aria-label="Search participant" /></label>
            <label><Filter className="h-4 w-4" /><select value={cellFilter} onChange={event => setCellFilter(event.target.value)} aria-label="Filter by cell"><option value="all">All cells</option>{cellNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
            <select value={participantSort} onChange={event => setParticipantSort(event.target.value as 'participation' | 'score' | 'name')} aria-label="Sort participants"><option value="participation">Sort: Participation</option><option value="score">Sort: Average score</option><option value="name">Sort: Name</option></select>
          </div>
          {filteredParticipants.length ? (
            <div className="fni-la-table-wrap"><table><thead><tr><th>Participant</th><th>Cell</th><th>Submissions</th><th>Quizzes</th><th>Average</th></tr></thead><tbody>
              {filteredParticipants.slice(0, 8).map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.cell}</td><td>{row.submissions}</td><td>{row.quizzes}</td><td>{row.average === null ? '—' : `${row.average}%`}</td></tr>)}
            </tbody></table></div>
          ) : <EmptyState title="No participant records found" detail="Participant performance appears when tutors submit assignments or complete quizzes." />}
        </article>

        <article className="fni-la-panel" aria-label="Cell Performance Comparison">
          <div className="fni-la-section-heading"><div><span className="fni-la-heading-icon"><BarChart3 className="h-4 w-4" /></span><div><h2>Cell Performance Comparison</h2><p>Compare average scores from recorded assessments.</p></div></div></div>
          {cells.length ? (
            <div className="fni-la-cell-list">{cells.slice(0, 8).map(cell => <div className="fni-la-cell-row" key={cell.name}><div><strong>{cell.name}</strong><small>{cell.participants.size} participant(s) · {cell.submissions} assignment submissions</small></div><span>{cell.average === null ? '—' : `${cell.average}%`}</span></div>)}</div>
          ) : <EmptyState title="No cell-level results yet" detail="Cell comparisons appear when assessment records include cell assignments and graded scores." />}
        </article>
      </section>

      <section className="fni-la-bottom-grid">
        <article className="fni-la-panel" aria-label="Assessment Results and Grading">
          <div className="fni-la-section-heading"><div><span className="fni-la-heading-icon"><Award className="h-4 w-4" /></span><div><h2>Assessment Results &amp; Grading</h2><p>Recent assignment submissions and quiz attempts.</p></div></div><button type="button" className="fni-la-text-action" onClick={() => onNavigateSection('grades')}>Open gradebook<ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          {pendingSubmissions.length || pendingQuizReviews.length ? (
            <div className="fni-la-review-list">
              {pendingSubmissions.slice(0, 4).map(item => <div key={item.id}><div><strong>{item.tutor_name}</strong><small>{assignments.find(row => row.id === item.assignment_id)?.title || 'Assignment'} · {formatDate(item.submitted_at)}</small></div><StatusPill value={item.status.replace(/_/g, ' ')} /></div>)}
              {pendingQuizReviews.slice(0, 4).map(item => <div key={item.id}><div><strong>{item.tutor_name}</strong><small>{item.quiz_title || 'Quiz'} · {formatDate(item.completed_at)}</small></div><StatusPill value="Awaiting grading" /></div>)}
            </div>
          ) : <EmptyState title="No assessments awaiting grading" detail="Submitted work requiring review will appear here." />}
        </article>

        <article className="fni-la-panel fni-la-reports-panel" aria-label="Reports and Export">
          <div className="fni-la-section-heading"><div><span className="fni-la-heading-icon"><Download className="h-4 w-4" /></span><div><h2>Reports &amp; Export</h2><p>Export recorded learning results.</p></div></div></div>
          <label className="fni-la-field-label" htmlFor="fni-la-report-type">Report type</label>
          <select id="fni-la-report-type" value={reportType} onChange={event => setReportType(event.target.value as 'all' | 'assignments' | 'quizzes')}>
            <option value="all">All assessment results</option><option value="assignments">Assignment submissions</option><option value="quizzes">Quiz attempts</option>
          </select>
          <p className="fni-la-report-count">{reportType === 'quizzes' ? rangeAttempts.length : reportType === 'assignments' ? rangeSubmissions.length : rangeAttempts.length + rangeSubmissions.length} record(s) in this export.</p>
          <button type="button" className="fni-la-primary-action fni-la-export" onClick={handleExport}><Download className="h-4 w-4" /> Export CSV</button>
          <button type="button" className="fni-la-panel-footer" onClick={() => onNavigateSection('grades')}>Open gradebook<ChevronRight className="h-4 w-4" /></button>
        </article>
      </section>

      <section className="fni-la-policy-note" aria-label="Assessment Settings">
        <div><span className="fni-la-heading-icon"><Clock className="h-4 w-4" /></span><div><h2>Assessment Settings</h2><p>Assignment due dates, late-submission rules and attempt limits are configured on each assessment. Quiz timing and result-release settings are managed in quiz setup.</p></div></div>
        <button type="button" className="fni-la-text-action" onClick={() => onNavigateSection('assignments')}>Manage assessments<ChevronRight className="h-4 w-4" /></button>
      </section>

      {upcomingEvents.length > 0 && (
        <section className="fni-la-events" aria-label="Upcoming Learning Events">
          <div className="fni-la-section-heading"><div><span className="fni-la-heading-icon"><Calendar className="h-4 w-4" /></span><div><h2>Upcoming Learning Events</h2><p>Scheduled learning sessions and workshops.</p></div></div><button type="button" className="fni-la-text-action" onClick={() => onNavigateSection('events')}>View events<ArrowUpRight className="h-3.5 w-3.5" /></button></div>
          <div className="fni-la-event-list">{upcomingEvents.slice(0, 4).map(item => <div key={item.id}><div><strong>{item.title}</strong><small>{formatDate(item.event_date)} · {item.start_time}–{item.end_time}</small></div><span>{item.meeting_type.replace('_', ' ')}</span></div>)}</div>
        </section>
      )}
    </div>
  );
};
