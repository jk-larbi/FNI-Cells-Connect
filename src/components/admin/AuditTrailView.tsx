import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { ReportService } from '../../services/reportService';
import { History, Shield, Search } from 'lucide-react';
import { Button } from '../common/Button';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadLogs() {
      const data = await ReportService.getAuditLogs();
      setLogs(data);
    }
    loadLogs();
  }, []);

  const filtered = logs.filter(
    l =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.user_name && l.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      l.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wide">
            <History className="w-3.5 h-3.5 text-navy-800" /> System Integrity & Audit Log
          </div>
          <h2 className="text-xl font-bold text-navy-950 mt-1">Audit Trail & Action History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of report submissions, status reviews, approvals, and administrative mutations
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search audit records..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full text-xs rounded-md border border-slate-300 pl-8 pr-3 py-2 bg-white focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
          />
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No audit records match this search.
          </div>
        ) : filtered.map(log => (
          <article key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy-900 break-words">{log.user_name || 'System'}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {new Date(log.created_at).toLocaleString(undefined, { timeZone: 'UTC' })} UTC
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                log.action.includes('APPROVE')
                  ? 'bg-emerald-50 text-emerald-700'
                  : log.action.includes('REVISION')
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-navy-50 text-navy-800'
              }`}>
                {log.action}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Target</p>
                <p className="mt-1 font-semibold text-slate-700 break-words">{log.entity_type}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Client IP</p>
                <p className="mt-1 font-mono text-slate-600 break-all">{log.ip_address || 'Not recorded'}</p>
              </div>
            </div>
            <details className="rounded-lg bg-slate-50 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-navy-800">View action details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-600">{JSON.stringify(log.details, null, 2)}</pre>
            </details>
          </article>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Timestamp (UTC)</th>
              <th className="px-4 py-3">Initiator / User</th>
              <th className="px-4 py-3">Action Type</th>
              <th className="px-4 py-3">Target Entity</th>
              <th className="px-4 py-3">Payload Details</th>
              <th className="px-4 py-3">Client IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.map(log => (
              <tr key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                  {new Date(log.created_at).toLocaleString(undefined, { timeZone: 'UTC' })} UTC
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-sans font-semibold text-navy-900">
                  {log.user_name || 'System Daemon'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action.includes('APPROVE')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : log.action.includes('REVISION')
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-navy-50 text-navy-800 border border-navy-200'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">{log.entity_type}</td>
                <td className="px-4 py-3 font-sans text-xs text-slate-600 max-w-md truncate">
                  {JSON.stringify(log.details)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-400">{log.ip_address || 'Not recorded'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
