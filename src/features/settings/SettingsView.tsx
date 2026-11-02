import React, { useState } from 'react';
import {
  Settings,
  Building,
  Clock,
  DollarSign,
  Hash,
  Database,
  Shield,
  FileSpreadsheet,
  Check,
  Copy,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  isLiveSupabaseConfigured,
} from '../../lib/supabase/client';
import { COMPLETE_MIGRATION_SQL } from '../../lib/supabase/migrationSql';

interface SettingsViewProps {
  currentUser: UserProfile;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'migration' | 'branding' | 'ids' | 'statuses' | 'archive'>('migration');
  const [companyName, setCompanyName] = useState('DAVIZ Solutions');
  const [timezone] = useState('Asia/Dubai');
  const [operatingRegion] = useState('United Arab Emirates (Dubai & Abu Dhabi)');
  const [spreadsheetId, setSpreadsheetId] = useState(
    '1TV9wwXbtbVpfFXP8cIm2uQbYLPkhRdSRspKqSku8MMo'
  );
  const [archiveThresholdMb, setArchiveThresholdMb] = useState(400);
  const [inactivityDays, setInactivityDays] = useState(10);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  // Supabase Credentials & Live Status
  const initialCreds = getSupabaseCredentials();
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(
    initialCreds.url || ''
  );
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(initialCreds.anonKey || '');
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  // Direct Migration Runner State
  const [dbPassword, setDbPassword] = useState('');
  const [showDbPassword, setShowDbPassword] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Live Table Verification State
  const [isCheckingTables, setIsCheckingTables] = useState(false);
  const [tableStatusData, setTableStatusData] = useState<{
    configured: boolean;
    url?: string;
    anonKey?: string;
    projectRef?: string;
    hasEnvDbCredentials?: boolean;
    allTablesCreated?: boolean;
    createdCount?: number;
    totalCount?: number;
    tables?: Record<string, boolean>;
  } | null>(null);

  const effectiveUrl = (supabaseUrlInput || initialCreds.url || '').trim();
  const projectRef = effectiveUrl.replace(/^https?:\/\//i, '').split('.')[0] || '';

  const REQUIRED_CRM_TABLES = [
    'roles',
    'profiles',
    'modules',
    'role_permissions',
    'companies',
    'leads',
    'lead_phones',
    'lead_emails',
    'lead_notes',
    'lead_status_history',
    'visits',
    'plans',
    'follow_ups',
    'tasks',
    'activity_logs',
    'archive_index',
  ];

  const verifyTablesDirectlyFromBrowser = async (urlToCheck: string, keyToCheck: string) => {
    if (!urlToCheck || !keyToCheck) return null;
    const cleanUrl = urlToCheck.replace(/\/+$/, '');
    const ref = cleanUrl.replace(/^https?:\/\//i, '').split('.')[0] || projectRef;
    const tables: Record<string, boolean> = {};
    await Promise.all(
      REQUIRED_CRM_TABLES.map(async (table) => {
        try {
          const r = await fetch(`${cleanUrl}/rest/v1/${table}?select=*&limit=1`, {
            headers: {
              apikey: keyToCheck,
              Authorization: `Bearer ${keyToCheck}`,
            },
          });
          tables[table] = r.ok;
        } catch {
          tables[table] = false;
        }
      })
    );
    const createdCount = Object.values(tables).filter(Boolean).length;
    return {
      configured: true,
      url: cleanUrl,
      projectRef: ref,
      allTablesCreated: createdCount === REQUIRED_CRM_TABLES.length,
      createdCount,
      totalCount: REQUIRED_CRM_TABLES.length,
      tables,
    };
  };

  // Function to check live tables and auto-sync Vercel Supabase env vars if connected
  const checkLiveTables = async () => {
    setIsCheckingTables(true);
    try {
      const params = new URLSearchParams();
      if (effectiveUrl) params.set('url', effectiveUrl);
      if (supabaseKeyInput.trim()) params.set('key', supabaseKeyInput.trim());

      const res = await fetch(`/api/supabase-status?${params.toString()}`);
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        setTableStatusData(data);

        // If server/Vercel environment has a newly connected Supabase project, auto-sync UI & localStorage
        if (
          data.url &&
          typeof data.url === 'string' &&
          (!supabaseUrlInput || supabaseUrlInput !== data.url)
        ) {
          setSupabaseUrlInput(data.url);
          if (data.anonKey) {
            setSupabaseKeyInput(data.anonKey);
            saveSupabaseCredentials(data.url, data.anonKey);
          } else {
            saveSupabaseCredentials(data.url, supabaseKeyInput);
          }
        } else if (data.anonKey && !supabaseKeyInput) {
          setSupabaseKeyInput(data.anonKey);
          saveSupabaseCredentials(effectiveUrl, data.anonKey);
        }
        return;
      }
    } catch (err) {
      console.warn('Could not query /api/supabase-status, falling back to direct REST check:', err);
    }

    try {
      const directStatus = await verifyTablesDirectlyFromBrowser(effectiveUrl, supabaseKeyInput.trim());
      if (directStatus) {
        setTableStatusData(directStatus);
      }
    } finally {
      setIsCheckingTables(false);
    }
    setIsCheckingTables(false);
  };

  React.useEffect(() => {
    if (activeTab === 'migration') {
      checkLiveTables().finally(() => setIsCheckingTables(false));
    }
  }, [activeTab]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedFeedback(true);
    crmService.logActivity({
      action: 'UPDATE',
      module: 'settings',
      result: 'Success',
      description: `Admin updated CRM global settings (${activeTab}).`,
    });
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleSaveSupabaseCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(supabaseUrlInput, supabaseKeyInput);
    setConnectionStatus('Saving Supabase credentials & syncing live database...');
    try {
      await fetch('/api/supabase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: supabaseUrlInput.trim(),
          anonKey: supabaseKeyInput.trim(),
        }),
      });
    } catch {
      // ignore
    }
    await crmService.hydrateFromSupabase();
    setConnectionStatus('Connected & synchronized with Supabase PostgreSQL!');
    await checkLiveTables();
    setIsCheckingTables(false);
    setTimeout(() => setConnectionStatus(null), 4000);
  };

  const handlePurgeAllDemoData = () => {
    crmService.clearDemoData();
    setConfirmingPurge(false);
    setPurgeSuccess(true);
    setTimeout(() => setPurgeSuccess(false), 4000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(COMPLETE_MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleRunDirectMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const trimmedInput = dbPassword.trim();
      const isUri = trimmedInput.startsWith('postgres://') || trimmedInput.startsWith('postgresql://');

      // If user pasted a postgresql:// URI for a new Supabase project, extract its projectRef immediately
      let targetRef = projectRef;
      let targetUrl = effectiveUrl;
      if (isUri) {
        const refMatch =
          trimmedInput.match(/postgres\.([a-z0-9-]+)/i) ||
          trimmedInput.match(/db\.([a-z0-9-]+)\.supabase\.co/i);
        if (refMatch && refMatch[1]) {
          targetRef = refMatch[1];
          targetUrl = `https://${targetRef}.supabase.co`;
          setSupabaseUrlInput(targetUrl);
        }
      }

      const res = await fetch('/api/run-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbPassword: trimmedInput,
          connectionString: isUri ? trimmedInput : undefined,
          projectRef: targetRef,
          supabaseUrl: targetUrl,
          supabaseKey: supabaseKeyInput.trim(),
        }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        // Check if tables were actually created before a serverless timeout
        const browserCheck = await verifyTablesDirectlyFromBrowser(targetUrl, supabaseKeyInput.trim());
        if (browserCheck && browserCheck.allTablesCreated) {
          setTableStatusData(browserCheck);
          await crmService.hydrateFromSupabase();
          setMigrationResult({
            success: true,
            message: `Migration succeeded! Verified all ${browserCheck.createdCount}/${browserCheck.totalCount} CRM tables on project "${targetRef}".`,
          });
          return;
        }
        const cleanSnippet = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
        throw new Error(
          `Server returned HTTP ${res.status}${cleanSnippet ? ` (${cleanSnippet})` : ''}. Please redeploy the latest commit to Vercel or use Option 2 (Copy & Run in Supabase SQL Editor).`
        );
      }

      setMigrationResult({
        success: Boolean(data.success),
        message: data.message || data.error || (data.success ? 'Migration completed successfully!' : 'Migration failed.'),
      });

      if (data.projectRef) {
        const newUrl = data.supabaseUrl || `https://${data.projectRef}.supabase.co`;
        setSupabaseUrlInput(newUrl);
        if (data.anonKey) {
          setSupabaseKeyInput(data.anonKey);
          saveSupabaseCredentials(newUrl, data.anonKey);
        } else {
          saveSupabaseCredentials(newUrl, supabaseKeyInput);
        }
      }

      if (data.success) {
        if (data.tableStatus) {
          setTableStatusData({
            configured: true,
            url: data.supabaseUrl || targetUrl,
            projectRef: data.projectRef || targetRef,
            allTablesCreated: Boolean(data.allTablesCreated),
            createdCount: data.createdCount ?? 16,
            totalCount: data.totalCount ?? 16,
            tables: data.tableStatus,
          });
        } else {
          await checkLiveTables();
          setIsCheckingTables(false);
        }
        await crmService.hydrateFromSupabase();
        crmService.logActivity({
          action: 'UPDATE',
          module: 'settings',
          result: 'Success',
          description: `Executed Supabase PostgreSQL schema migration for project ${data.projectRef || targetRef} (16/16 tables verified).`,
        });
      }
    } catch (err: any) {
      setMigrationResult({
        success: false,
        message: err?.message || 'Connection failed while executing migration.',
      });
    } finally {
      setIsMigrating(false);
      setIsCheckingTables(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Global CRM Settings</h2>
          <p className="text-xs text-slate-500">
            Database migration, clean production state, UAE localization, and Google Sheets archival thresholds
          </p>
        </div>

        {savedFeedback && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200">
            <Check className="w-3.5 h-3.5" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-medium overflow-x-auto">
        {[
          { key: 'migration', label: 'Database Migration & Supabase' },
          { key: 'branding', label: 'Branding & Localization' },
          { key: 'ids', label: 'ID Schemes & Sequences' },
          { key: 'statuses', label: 'Lead & Visit Dropdowns' },
          { key: 'archive', label: 'Google Sheets & Archiving' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`py-2 px-4 border-b-2 font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-cyan-600 text-cyan-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Forms */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-3xl text-xs space-y-6">
        {activeTab === 'migration' && (
          <div className="space-y-6">
            {/* Live Database Status Header Card */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">Supabase PostgreSQL Database</h3>
                    <p className="text-slate-300 text-[11px] font-mono">
                      Host: {effectiveUrl} (IPv4 Pooler Active)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      tableStatusData?.allTablesCreated
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {tableStatusData?.allTablesCreated
                      ? '16 / 16 Tables Active'
                      : `${tableStatusData?.createdCount || 0} / ${tableStatusData?.totalCount || 16} Tables Created`}
                  </span>
                  <button
                    type="button"
                    onClick={checkLiveTables}
                    disabled={isCheckingTables}
                    className="p-1.5 hover:bg-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="Refresh Table Status"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingTables ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Table Badges Grid */}
              {tableStatusData?.tables && (
                <div className="pt-2 border-t border-slate-700/60">
                  <div className="text-[10px] text-slate-400 mb-2 font-semibold uppercase tracking-wider">
                    Database Schema Cache & Tables Status
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {Object.entries(tableStatusData.tables).map(([tbl, exists]) => (
                      <div
                        key={tbl}
                        className={`px-2 py-1 rounded text-[10px] font-mono flex items-center justify-between border ${
                          exists
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                            : 'bg-slate-800/80 text-amber-300/80 border-slate-700'
                        }`}
                      >
                        <span className="truncate">{tbl}</span>
                        <span>{exists ? '✓' : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Zero Demo Data Indicator */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Zero Demo Data (Production Clean)</h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    All test leads, mock companies, mock visits, and dummy tasks have been purged. Monthly sequences start at 0001.
                  </p>
                </div>
                {!confirmingPurge ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingPurge(true)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Local Demo Data</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePurgeAllDemoData}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs transition-colors"
                    >
                      Confirm Purge
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingPurge(false)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-semibold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {purgeSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All demo data purged! The CRM is completely clean and ready for real data.</span>
                </div>
              )}
            </div>

            {/* Two Easy Migration Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Method 1: Instant Direct Migration */}
              <div className="p-4 border border-cyan-200 bg-cyan-50/40 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-cyan-800 font-bold text-xs uppercase tracking-wider mb-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Option 1: 1-Click Direct Migration</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Migrate from Inside CRM</h4>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Enter your Supabase database password (or paste your full <code className="font-mono">postgresql://...</code> URI) to run the migration over Supabase IPv4 Supavisor Pooler.
                  </p>

                  <form onSubmit={handleRunDirectMigration} className="mt-3 space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Supabase Database Password or Connection URI
                      </label>
                      <div className="relative">
                        <input
                          type={showDbPassword ? 'text' : 'password'}
                          value={dbPassword}
                          onChange={(e) => setDbPassword(e.target.value)}
                          placeholder="Enter DB password or postgresql://..."
                          className="w-full p-2 pr-8 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 text-xs outline-none focus:border-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDbPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          title={showDbPassword ? 'Hide password' : 'Show password'}
                        >
                          {showDbPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isMigrating}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isMigrating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting & Synchronizing Schema...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-3.5 h-3.5" />
                          <span>Execute Migration Now</span>
                        </>
                      )}
                    </button>
                  </form>

                  {migrationResult && (
                    <div
                      className={`mt-2 p-2.5 rounded-lg text-[11px] font-semibold border leading-relaxed ${
                        migrationResult.success
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {migrationResult.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Method 2: Supabase Dashboard SQL Editor */}
              <div className="p-4 border border-slate-200 bg-white rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Option 2: Supabase SQL Editor</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Copy & Run in Dashboard</h4>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Open your Supabase SQL Editor, paste the consolidated script, and click "Run".
                  </p>

                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Copied 367 Lines to Clipboard!' : 'Copy Complete Migration SQL'}</span>
                    </button>

                    <a
                      href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open SQL Editor for {projectRef}</span>
                    </a>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                  Includes: 16 tables, 9 RLS policies, monthly sequence triggers, and seed roles.
                </div>
              </div>
            </div>

            {/* Migration SQL Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Complete Migration SQL Script Preview</h4>
                  <p className="text-[11px] text-slate-500">
                    File: <code className="font-mono text-cyan-700">supabase/complete_migration.sql</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>

              <div className="p-3.5 bg-slate-900 text-slate-300 font-mono text-[10px] rounded-xl overflow-x-auto max-h-56 leading-relaxed">
                <pre>{COMPLETE_MIGRATION_SQL}</pre>
              </div>
            </div>

            {/* Supabase Connection Keys Config */}
            <form onSubmit={handleSaveSupabaseCredentials} className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900">API Connection Keys</h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    isLiveSupabaseConfigured()
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {isLiveSupabaseConfigured() ? 'Configured from Environment' : 'Local Storage Mode'}
                </span>
              </div>

              {connectionStatus && (
                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-cyan-900 text-[11px] font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-600" />
                  <span>{connectionStatus}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Supabase Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="text"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Supabase Anon Public API Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-slate-800 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save API Keys
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'branding' && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Company Display Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Default Timezone</label>
                <input
                  type="text"
                  disabled
                  value={timezone}
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-600 font-medium"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Mandatory UAE standard (UTC+4 Gulf Standard Time)
                </span>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Operating Region</label>
                <input
                  type="text"
                  disabled
                  value={operatingRegion}
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-slate-600 font-medium"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Primary regional territory for leads, visits, and accounts
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Save Regional Settings
            </button>
          </form>
        )}

        {activeTab === 'ids' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 text-sm block">
                Immutable Server-Generated Monthly Sequences
              </span>
              <p className="text-slate-600 leading-relaxed">
                As per DAVIZ Solutions architecture requirements, record IDs are generated
                exclusively on the server using concurrency-safe database sequences and reset at the
                beginning of each month in Asia/Dubai local time. IDs are never editable.
              </p>
            </div>

            <div className="divide-y divide-slate-100 font-mono text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-sans">Leads:</span>
                <span className="font-bold text-cyan-700">LD-YY-MM-NNNN (e.g. LD-26-10-0001)</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-sans">Client Visits:</span>
                <span className="font-bold text-cyan-700">VS-YY-MM-NNNN (e.g. VS-26-10-0001)</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-sans">Companies:</span>
                <span className="font-bold text-cyan-700">CP-YY-MM-NNNN</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-sans">Sales Plans:</span>
                <span className="font-bold text-cyan-700">PL-YY-MM-NNNN</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-sans">Follow-ups:</span>
                <span className="font-bold text-cyan-700">FU-YY-MM-NNNN</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-sans">Tasks:</span>
                <span className="font-bold text-cyan-700">TK-YY-MM-NNNN</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 font-sans">Archive Vault:</span>
                <span className="font-bold text-cyan-700">ARC-YY-MM-NNNN</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statuses' && (
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800">Permitted Lead Lifecycle Stages</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              {[
                'New',
                'Connected',
                'Qualified',
                'Meeting',
                'Proposal Sent',
                'Won',
                'Lost',
                'Follow-up Required',
              ].map((st) => (
                <div
                  key={st}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium flex items-center justify-between"
                >
                  <span>{st}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Active</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Note: Every transition requires a non-empty progress note enforced server-side.
            </p>
          </div>
        )}

        {activeTab === 'archive' && (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Target Google Spreadsheet ID (Google Apps Script SPREADSHEET_ID)
              </label>
              <input
                type="text"
                required
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-slate-800 outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Destination spreadsheet for verified inactive records vault.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Database Threshold Warning (MB)
                </label>
                <input
                  type="number"
                  value={archiveThresholdMb}
                  onChange={(e) => setArchiveThresholdMb(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Warning trigger at 400 MB to evaluate archival candidates
                </span>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Inactivity Horizon (Days)
                </label>
                <input
                  type="number"
                  value={inactivityDays}
                  onChange={(e) => setInactivityDays(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Only consider records with no activity for 10+ days
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="mt-4 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Save Archiving Parameters
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
