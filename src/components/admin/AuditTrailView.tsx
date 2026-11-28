import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { ReportService } from '../../services/reportService';
import { History, Search, RefreshCw, Shield, X, Download, FileText } from 'lucide-react';

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

  useEffect(() => { loadLogs(); }, []);

  const query = searchTerm.trim().toLowerCase();
  const filtered = logs.filter(log =>
    log.action.toLowerCase().includes(query) ||
    (log.user_name && log.user_name.toLowerCase().includes(query)) ||
    log.entity_type.toLowerCase().includes(query) ||
    (log.ip_address || '').toLowerCase().includes(query) ||
    JSON.stringify(log.details ?? {}).toLowerCase().includes(query) ||
    (query && new Date(log.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Accra' }).toLowerCase().includes(query))
  );

  const formatTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-GB', {
      timeZone: 'Africa/Accra', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }) + ' GMT';
  };

  const actionTone = (action: string) => {
    const value = action.toUpperCase();
    if (value.includes('APPROV')) return 'is-success';
    if (value.includes('REVISION') || value.includes('REJECT') || value.includes('DELETE')) return 'is-danger';
    if (value.includes('SECURITY') || value.includes('PASSWORD') || value.includes('LOGIN')) return 'is-warning';
    return 'is-neutral';
  };

  const exportLogs = () => {
    const columns = ['Timestamp (Ghana time)', 'Administrator', 'Action', 'Category', 'Details', 'Client IP'];
    const rows = filtered.map(log => [
      formatTimestamp(log.created_at), log.user_name || 'System', log.action,
      log.entity_type, JSON.stringify(log.details ?? {}), log.ip_address || 'Not recorded'
    ]);
    const csv = [columns, ...rows].map(row =>
      row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')
    ).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fni-audit-trail.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fni-audit-trail-stitch space-y-5 min-w-0">
      <section className="fni-audit-heading flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0">
          <p className="fni-audit-eyebrow">FNI ADMIN · ACTIVITY LOG</p>
          <h1>Audit trail</h1>
          <p className="fni-audit-subtitle">Know what changed, when and by whom.</p>
        </div>
        <div className="fni-audit-actions flex flex-col sm:flex-row gap-2.5">
          <label className="fni-audit-search relative flex-1 hidden md:flex">
            <Search className="w-4 h-4" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search audit trail"
              placeholder="Search administrator, action or date"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />
            {searchTerm && <button type="button" aria-label="Clear search" onClick={() => setSearchTerm('')}><X className="w-4 h-4" /></button>}
          </label>
          <button type="button" onClick={exportLogs} disabled={filtered.length === 0} className="fni-audit-export">
            <Download className="w-4 h-4" /> Export log
          </button>
          <button type="button" onClick={loadLogs} disabled={isLoading} className="fni-audit-refresh" aria-label="Refresh audit records">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </section>

      <section className="fni-audit-mobile-search md:hidden" aria-label="Find activity">
        <label htmlFor="fni-audit-mobile-search-input">Find activity</label>
        <div className="fni-audit-mobile-search-field">
          <Search className="w-4 h-4" aria-hidden="true" />
          <input
            id="fni-audit-mobile-search-input"
            type="search"
            placeholder="Search administrator, action or date"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />
          {searchTerm && <button type="button" aria-label="Clear search" onClick={() => setSearchTerm('')}><X className="w-4 h-4" /></button>}
        </div>
      </section>

      <section className="fni-audit-meta flex items-center justify-between gap-3" aria-live="polite">
        <div className="flex items-center gap-2"><History className="w-4 h-4" /><span>Activity history</span></div>
        <span>{isLoading ? 'Loading records…' : `${filtered.length} of ${logs.length} records`}</span>
      </section>

      {loadError && (
        <div role="alert" className="fni-audit-error">
          <strong>Audit records could not be loaded</strong>
          <p>{loadError}</p>
          <button type="button" onClick={loadLogs}>Try again</button>
        </div>
      )}

      <section className="fni-audit-table-wrap hidden md:block" aria-label="Audit records">
        <div className="overflow-x-auto">
          <table className="fni-audit-table w-full text-left">
            <thead><tr>
              <th>Action</th><th>Details</th><th>Administrator</th><th>Category</th><th>Timestamp</th><th>Client IP</th>
            </tr></thead>
            <tbody>
              {isLoading && logs.length === 0 ? (
                <tr><td colSpan={6} className="fni-audit-empty"><RefreshCw className="w-5 h-5 animate-spin" />Loading audit records…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="fni-audit-empty"><Shield className="w-6 h-6" /><strong>{logs.length ? 'No matching activity' : 'No audit activity recorded yet'}</strong><span>{logs.length ? 'Try a different search term.' : 'Administrative actions will appear here when recorded.'}</span></td></tr>
              ) : filtered.map(log => (
                <tr key={log.id}>
                  <td><span className={`fni-audit-action ${actionTone(log.action)}`}>{log.action}</span></td>
                  <td className="fni-audit-details">
                    <details>
                      <summary>{JSON.stringify(log.details ?? {})}</summary>
                      <pre>{JSON.stringify(log.details ?? {}, null, 2)}</pre>
                    </details>
                  </td>
                  <td className="fni-audit-admin">{log.user_name || 'System'}</td>
                  <td><span className="fni-audit-category">{log.entity_type}</span></td>
                  <td className="fni-audit-time">{formatTimestamp(log.created_at)}</td>
                  <td className="fni-audit-ip">{log.ip_address || 'Not recorded'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="md:hidden fni-audit-mobile space-y-3" aria-label="Audit activity cards">
        {isLoading && logs.length === 0 ? (
          <div className="fni-audit-empty"><RefreshCw className="w-5 h-5 animate-spin" />Loading audit records…</div>
        ) : filtered.length === 0 ? (
          <div className="fni-audit-empty"><Shield className="w-6 h-6" /><strong>{logs.length ? 'No matching activity' : 'No audit activity recorded yet'}</strong><span>{logs.length ? 'Try a different search term.' : 'Administrative actions will appear here when recorded.'}</span></div>
        ) : filtered.map(log => (
          <article key={log.id} className="fni-audit-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h2>{log.action}</h2><p>{log.user_name || 'System'}</p></div>
              <span className={`fni-audit-action ${actionTone(log.action)}`}>{log.entity_type}</span>
            </div>
            <div className="fni-audit-card-time">{formatTimestamp(log.created_at)}</div>
            <details>
              <summary><FileText className="w-4 h-4" /> View action details</summary>
              <pre>{JSON.stringify(log.details ?? {}, null, 2)}</pre>
            </details>
            <div className="fni-audit-card-ip">Client IP <span>{log.ip_address || 'Not recorded'}</span></div>
          </article>
        ))}
      </section>
    </div>
  );
};
