import React, { useState, useEffect } from 'react';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  testSupabaseConnection, 
  SUPABASE_SQL_SCHEMA 
} from '../../lib/supabase';
import { 
  checkSupabaseTablesStatus, 
  seedCellsToSupabase, 
  TablesStatus 
} from '../../lib/supabaseService';
import { resetStore, loadStore, formatDate, syncWithSupabase } from '../../lib/storage';
import { getAdminSecurityConfig, setAdminNewPassword } from '../../lib/auth';
import { 
  Database, 
  ShieldCheck, 
  Check, 
  Copy, 
  Download, 
  RotateCcw, 
  Server, 
  AlertCircle, 
  ExternalLink,
  Lock,
  KeyRound,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';

interface BackendSettingsProps {
  onDataReset: () => void;
}

export const BackendSettings: React.FC<BackendSettingsProps> = ({ onDataReset }) => {
  const initialConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(initialConfig.url);
  const [anonKey, setAnonKey] = useState(initialConfig.anonKey);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);

  // Table verification state
  const [tablesStatus, setTablesStatus] = useState<TablesStatus | null>(null);
  const [isVerifyingTables, setIsVerifyingTables] = useState(false);

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // Admin password change states
  const [adminConfig, setAdminConfig] = useState(() => getAdminSecurityConfig());
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fni-reporting.org';

  // Automatically check table status if configured on mount
  useEffect(() => {
    if (initialConfig.url && initialConfig.anonKey) {
      handleVerifyTables();
    }
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(url.trim(), anonKey.trim());
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      saveStoredSupabaseConfig({
        url: url.trim(),
        anonKey: anonKey.trim(),
        connected: true,
        lastChecked: new Date().toISOString()
      });
      handleVerifyTables();
    }
  };

  const handleSaveConfig = () => {
    saveStoredSupabaseConfig({
      url: url.trim(),
      anonKey: anonKey.trim(),
      connected: Boolean(url.trim() && anonKey.trim()),
      lastChecked: new Date().toISOString()
    });
    setTestResult({
      success: true,
      message: 'Configuration saved. Running connection verification...'
    });
    handleTestConnection();
  };

  const handleVerifyTables = async () => {
    setIsVerifyingTables(true);
    const status = await checkSupabaseTablesStatus();
    setTablesStatus(status);
    setIsVerifyingTables(false);
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    const cells = loadStore().cells;
    const res = await seedCellsToSupabase(cells);
    setSeedResult(res);
    setIsSeeding(false);
    if (res.success) {
      handleVerifyTables();
    }
  };

  const handleSyncWithSupabase = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const res = await syncWithSupabase();
    setSyncResult(res);
    setIsSyncing(false);
    if (res.success) {
      onDataReset(); // Trigger UI re-render
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'fni_supabase_schema.sql';
    link.click();
  };

  const handleCopyEnv = () => {
    const envText = `VITE_SUPABASE_URL="${url || 'https://your-project.supabase.co'}"\nVITE_SUPABASE_ANON_KEY="${anonKey || 'your-anon-key'}"`;
    navigator.clipboard.writeText(envText);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 3000);
  };

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(redirectUrl);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 3000);
  };

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMsg(null);

    if (adminNewPass.length < 8) {
      setPasswordChangeMsg({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }
    if (adminNewPass !== adminConfirmPass) {
      setPasswordChangeMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    const res = await setAdminNewPassword(adminNewPass);
    if (res.success) {
      setAdminConfig(getAdminSecurityConfig());
      setAdminNewPass('');
      setAdminConfirmPass('');
      setPasswordChangeMsg({ type: 'success', text: 'Administrator password updated securely. Initial credentials remain disabled.' });
    } else {
      setPasswordChangeMsg({ type: 'error', text: res.message || 'Failed to update password.' });
    }
  };

  const handleExportBackup = () => {
    const data = loadStore();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FNI_System_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const handleResetData = () => {
    if (window.confirm('Clear all reports and restore clean production baseline?')) {
      resetStore();
      setResetConfirmed(true);
      onDataReset();
      setTimeout(() => setResetConfirmed(false), 3000);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold text-[#0F2447] tracking-tight font-serif-title">
          Supabase & Backend Architecture
        </h1>
        <p className="text-sm text-[#5B6472] mt-0.5">
          Production PostgreSQL schemas, Supabase Authentication, Row Level Security (RLS), and database synchronization
        </p>
      </div>

      {/* Supabase 4-Step Setup Guide */}
      <div className="bg-[#FAFBFD] border border-[#E3E6EB] rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E6EB]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#B8923A]" />
            <h2 className="text-sm font-semibold text-[#0F2447]">
              Supabase Backend Setup Checklist
            </h2>
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#1B3F7A] font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span>Open Supabase Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="p-3 bg-white border border-[#E3E6EB] rounded">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-[#0F2447]">1. Project API</span>
              <span className={`w-2 h-2 rounded-full ${url && anonKey ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
            <p className="text-[#5B6472] text-[11px] leading-relaxed">
              Create a project on Supabase and enter the Project URL & anon key below.
            </p>
          </div>

          <div className="p-3 bg-white border border-[#E3E6EB] rounded">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-[#0F2447]">2. SQL Schema</span>
              <span className={`w-2 h-2 rounded-full ${tablesStatus?.reportsTable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
            <p className="text-[#5B6472] text-[11px] leading-relaxed">
              Run the provided SQL script in the Supabase SQL Editor to provision tables & RLS.
            </p>
          </div>

          <div className="p-3 bg-white border border-[#E3E6EB] rounded">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-[#0F2447]">3. Seed Fellowship</span>
              <span className={`w-2 h-2 rounded-full ${tablesStatus?.cellsTable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
            <p className="text-[#5B6472] text-[11px] leading-relaxed">
              Push the 6 registered foundation cells to Supabase with one click below.
            </p>
          </div>

          <div className="p-3 bg-white border border-[#E3E6EB] rounded">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-[#0F2447]">4. OAuth Redirects</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[#5B6472] text-[11px] leading-relaxed">
              Add this app&apos;s URL to Supabase Auth &gt; URL Configuration &gt; Redirect URLs.
            </p>
          </div>
        </div>
      </div>

      {/* Supabase Connection Configuration */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E3E6EB] pb-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#B8923A]" />
            <div>
              <h2 className="text-sm font-semibold text-[#0F2447]">
                Supabase PostgreSQL Connection
              </h2>
              <p className="text-xs text-[#5B6472]">
                Configure your cloud Supabase database URL and anonymous API key
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
            testResult?.success || (url && anonKey)
              ? 'bg-[#E4F2E8] text-[#1E6B3A] border border-[#C4E1CC]' 
              : 'bg-[#F6F7F9] text-[#5B6472] border border-[#E3E6EB]'
          }`}>
            {testResult?.success ? 'Connected & Verified' : url && anonKey ? 'Credentials Configured' : 'Local Persistence Active'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-[#14213D] mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white text-[#14213D] font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-[#14213D] mb-1">
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white text-[#14213D] font-mono"
            />
          </div>
        </div>

        {testResult && (
          <div className={`p-3 rounded border text-xs flex items-start gap-2 ${
            testResult.success
              ? 'bg-[#E4F2E8] text-[#1E6B3A] border-[#C4E1CC]'
              : 'bg-[#FBE5E3] text-[#A32B21] border-[#F2C4BF]'
          }`}>
            {testResult.success ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>{testResult.message}</div>
          </div>
        )}

        {/* Database Tables Live Verification Bar */}
        <div className="p-4 bg-[#FAFBFD] border border-[#E3E6EB] rounded text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#0F2447]">Remote Tables Verification:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVerifyTables}
                disabled={isVerifyingTables || !url || !anonKey}
                className="px-2.5 py-1 text-[11px] font-medium text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors inline-flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isVerifyingTables ? 'animate-spin' : ''}`} />
                <span>{isVerifyingTables ? 'Checking...' : 'Check Tables'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="p-2 bg-white border border-[#E3E6EB] rounded flex items-center justify-between">
              <span>public.cells</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${tablesStatus?.cellsTable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                {tablesStatus?.cellsTable ? 'Ready' : 'Pending'}
              </span>
            </div>
            <div className="p-2 bg-white border border-[#E3E6EB] rounded flex items-center justify-between">
              <span>public.reports</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${tablesStatus?.reportsTable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                {tablesStatus?.reportsTable ? 'Ready' : 'Pending'}
              </span>
            </div>
            <div className="p-2 bg-white border border-[#E3E6EB] rounded flex items-center justify-between">
              <span>public.notifications</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${tablesStatus?.notificationsTable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                {tablesStatus?.notificationsTable ? 'Ready' : 'Pending'}
              </span>
            </div>
            <div className="p-2 bg-white border border-[#E3E6EB] rounded flex items-center justify-between">
              <span>public.profiles</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${tablesStatus?.profilesTable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                {tablesStatus?.profilesTable ? 'Ready' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Quick Actions: Seed Fellowship & Live Sync */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E3E6EB]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSeedDatabase}
                disabled={isSeeding || !url || !anonKey}
                className="px-3 py-1.5 text-xs font-medium text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5 text-[#B8923A]" />
                <span>{isSeeding ? 'Seeding...' : 'Seed Foundation Cells to Supabase'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncWithSupabase}
                disabled={isSyncing || !url || !anonKey}
                className="px-3 py-1.5 text-xs font-medium text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#B8923A] ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Live Supabase Data'}</span>
              </button>
            </div>

            {seedResult && (
              <span className={`text-[11px] font-medium ${seedResult.success ? 'text-emerald-700' : 'text-red-600'}`}>
                {seedResult.message}
              </span>
            )}
            {syncResult && (
              <span className={`text-[11px] font-medium ${syncResult.success ? 'text-emerald-700' : 'text-red-600'}`}>
                {syncResult.message}
              </span>
            )}
          </div>
        </div>

        {/* OAuth Redirect URL helper */}
        <div className="p-3.5 bg-[#FAFBFD] border border-[#E3E6EB] rounded text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#0F2447]">Supabase Auth OAuth Redirect URI:</span>
            <button
              onClick={handleCopyRedirect}
              className="text-xs text-[#1B3F7A] hover:underline font-medium inline-flex items-center gap-1"
            >
              {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#B8923A]" />}
              <span>{copiedRedirect ? 'Copied URL!' : 'Copy Redirect URL'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#5B6472]">
            In Supabase Dashboard &gt; <strong>Authentication</strong> &gt; <strong>URL Configuration</strong>, paste this URL into <strong>Site URL</strong> and <strong>Redirect URLs</strong> for Google and Apple sign-in:
          </p>
          <div className="p-2 bg-white border border-[#E3E6EB] rounded font-mono text-[11px] text-[#0F2447] select-all">
            {redirectUrl}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E3E6EB]">
          <span className="text-xs text-[#8C95A3]">
            Automatic fail-safe ensures zero downtime even during network transitions.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveConfig}
              className="px-3.5 py-1.5 text-xs font-medium text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors"
            >
              Save Configuration
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !url || !anonKey}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors disabled:opacity-50 shadow-xs"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>
      </div>

      {/* Row Level Security (RLS) Policy Architecture */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E3E6EB]">
          <ShieldCheck className="w-5 h-5 text-[#B8923A]" />
          <div>
            <h2 className="text-sm font-semibold text-[#0F2447]">
              PostgreSQL Row Level Security (RLS) Architecture
            </h2>
            <p className="text-xs text-[#5B6472]">
              Enforced at the database engine level to guarantee strict data segregation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-[#FAFBFD] border border-[#E3E6EB] rounded space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#0F2447]">
              <Lock className="w-3.5 h-3.5 text-[#B8923A]" />
              <span>Cell Leader Policy</span>
            </div>
            <p className="text-[#5B6472] leading-relaxed">
              Cell leaders can only query and submit weekly reports mapped directly to their assigned cell ID. Drafts remain privately editable until final submission.
            </p>
          </div>

          <div className="p-3.5 bg-[#FAFBFD] border border-[#E3E6EB] rounded space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#0F2447]">
              <Lock className="w-3.5 h-3.5 text-[#B8923A]" />
              <span>Administrator Policy</span>
            </div>
            <p className="text-[#5B6472] leading-relaxed">
              The Administrator has full read and update permissions to review, approve, or return reports, plus exclusive rights to register cells and dispatch notices directly to cell leaders.
            </p>
          </div>

          <div className="p-3.5 bg-[#FAFBFD] border border-[#E3E6EB] rounded space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#0F2447]">
              <Lock className="w-3.5 h-3.5 text-[#B8923A]" />
              <span>Immutability Trigger</span>
            </div>
            <p className="text-[#5B6472] leading-relaxed">
              Approved reports are locked against accidental modification. Reviewer notes and revision histories are tracked with UTC timestamps.
            </p>
          </div>
        </div>
      </div>

      {/* SQL Migration Script Box */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E3E6EB]">
          <div>
            <h2 className="text-sm font-semibold text-[#0F2447]">
              Complete PostgreSQL Schema & RLS SQL Script
            </h2>
            <p className="text-xs text-[#5B6472]">
              Paste into your Supabase SQL Editor to provision tables, enums, indexes, and RLS rules
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#B8923A]" />}
              <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
            </button>

            <button
              onClick={handleDownloadSql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#B8923A]" />
              <span>Download .sql</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <pre className="p-4 bg-[#0F2447] text-[#C9D2E3] font-mono text-[11px] leading-relaxed rounded overflow-x-auto max-h-64 border border-[#263B63]">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>
      </div>

      {/* Administrator Security & Password Management (Section 8.B) */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E3E6EB] pb-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-[#B8923A]" />
            <div>
              <h2 className="text-sm font-semibold text-[#0F2447]">
                Administrator Account Security & Credentials
              </h2>
              <p className="text-xs text-[#5B6472]">
                Manage central leadership authorization and update administrative master password
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
            adminConfig.initialSetupDone
              ? 'bg-[#E4F2E8] text-[#1E6B3A] border border-[#C4E1CC]'
              : 'bg-[#FBF0D9] text-[#8A5A00] border border-[#EED7A1]'
          }`}>
            {adminConfig.initialSetupDone ? 'Custom Password Configured' : 'Setup Credentials Active (admin123)'}
          </span>
        </div>

        <div className="p-3 bg-[#FAFBFD] border border-[#E3E6EB] rounded text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#0F2447]">Administrator Security Status:</span>
            <span className="font-mono text-[11px] text-[#5B6472]">
              {adminConfig.initialSetupDone ? 'Initial temporary setup credentials permanently disabled' : 'Awaiting first mandatory password update'}
            </span>
          </div>
          {adminConfig.lastChangedAt && (
            <p className="text-[11px] text-[#8C95A3]">
              Last changed: {formatDate(adminConfig.lastChangedAt)} ({new Date(adminConfig.lastChangedAt).toLocaleTimeString()})
            </p>
          )}
        </div>

        <form onSubmit={handleAdminPasswordSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-[#14213D] mb-1">
                New Administrator Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={adminNewPass}
                onChange={(e) => setAdminNewPass(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white text-[#14213D]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#14213D] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={adminConfirmPass}
                onChange={(e) => setAdminConfirmPass(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white text-[#14213D]"
              />
            </div>
          </div>

          {passwordChangeMsg && (
            <div className={`p-2.5 rounded border text-xs flex items-center gap-2 ${
              passwordChangeMsg.type === 'success'
                ? 'bg-[#E4F2E8] text-[#1E6B3A] border-[#C4E1CC]'
                : 'bg-[#FBE5E3] text-[#A32B21] border-[#F2C4BF]'
            }`}>
              {passwordChangeMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{passwordChangeMsg.text}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors shadow-xs"
            >
              Update Administrator Password
            </button>
          </div>
        </form>
      </div>

      {/* Vercel Hosting & Backup Actions */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E3E6EB] pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#B8923A]" />
            <h2 className="text-sm font-semibold text-[#0F2447]">
              Deployment & System Maintenance
            </h2>
          </div>

          <button
            onClick={handleCopyEnv}
            className="text-xs text-[#1B3F7A] hover:underline font-medium inline-flex items-center gap-1"
          >
            {copiedEnv ? 'Copied Vercel .env!' : 'Copy Vercel Environment Variables'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[#0F2447]">
              System Data Archive & Maintenance
            </div>
            <p className="text-[11px] text-[#5B6472]">
              Export full reporting archive or clear submissions for fresh reporting cycles.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0F2447] bg-white border border-[#E3E6EB] hover:bg-slate-50 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#B8923A]" />
              <span>Export System Backup (JSON)</span>
            </button>

            <button
              onClick={handleResetData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#A32B21] bg-white border border-[#F2C4BF] hover:bg-[#FBE5E3] rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetConfirmed ? 'Reset Complete!' : 'Clear Archive & Reset'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
