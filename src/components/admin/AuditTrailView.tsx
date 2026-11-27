import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { ReportService } from '../../services/reportService';
import { History, Search, RefreshCw, Shield, X } from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await ReportService.getAuditLogs();
      setLogs(data);
    } catch (error: any) {
      setLoadError(error?.message || 'Could not load audit records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const query = searchTerm.trim().toLowerCase();
  const filtered = logs.filter(log =>
    log.action.toLowerCase().includes(query) ||
    (log.user_name && log.user_name.toLowerCase().includes(query)) ||
    log.entity_type.toLowerCase().includes(query)
  );

  const clearSearch = () => setSearchTerm('');

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle p-4 sm:p-5 space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wide">
            <History className="w-3.5 h-3.5 text-navy-800" /> System Integrity & Audit Log
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-navy-950 mt-2">Audit Trail & Action History</h2>
          <p className="text-xs text-slate-500 mt-1">
            Review report submissions, status changes, approvals and administrative actions.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-navy-900 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh records'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="search"
            aria-label="Search audit records"
            placeholder="Search action, person or target..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            className="w-full min-h-11 text-xs rounded-xl border border-slate-300 pl-10 pr-10 py-2.5 bg-white focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1.5 min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 sm:ml-auto" aria-live="polite">
          {isLoading ? 'Loading audit records...' : `${filtered.length} of ${logs.length} records`}
        </p>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <p className="font-semibold">Audit records could not be loaded</p>
          <p className="mt-1 break-words">{loadError}</p>
          <button type="button" onClick={loadLogs} className="mt-3 min-h-10 px-3 rounded-lg bg-white border border-rose-200 font-semibold">
            Try again
          </button>
        </div>
      )}

      <div className="md:hidden space-y-3">
        {isLoading && logs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
            Loading audit records...
          </div>
        ) : !loadError && filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <Shield className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              {logs.length === 0 ? 'No audit activity recorded yet' : 'No records match this search'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {logs.length === 0 ? 'Administrative actions and report activity will appear here.' : 'Try another action, person or target name.'}
            </p>
            {searchTerm && (
              <button type="button" onClick={clearSearch} className="mt-3 min-h-10 px-3 rounded-lg bg-slate-100 text-xs font-semibold text-navy-900">
                Clear search
              </button>
            )}
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
              <span className={`shrink-0 max-w-[52%] rounded-full px-2.5 py-1 text-[10px] font-bold break-words ${
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
              <summary className="cursor-pointer min-h-8 flex items-center text-xs font-semibold text-navy-800">View action details</summary>
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
            {isLoading && logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading audit records...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {logs.length === 0 ? 'No audit activity recorded yet.' : 'No records match this search.'}
                  {searchTerm && <button type="button" onClick={clearSearch} className="ml-2 font-semibold text-navy-800 underline">Clear search</button>}
                </td>
              </tr>
            ) : filtered.map(log => (
              <tr key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                  {new Date(log.created_at).toLocaleString(undefined, { timeZone: 'UTC' })} UTC
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-sans font-semibold text-navy-900">{log.user_name || 'System Daemon'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.action.includes('APPROVE')
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : log.action.includes('REVISION')
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-navy-50 text-navy-800 border border-navy-200'
                  }`}>{log.action}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">{log.entity_type}</td>
                <td className="px-4 py-3 font-sans text-xs text-slate-600 max-w-md truncate">{JSON.stringify(log.details)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-400">{log.ip_address || 'Not recorded'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
