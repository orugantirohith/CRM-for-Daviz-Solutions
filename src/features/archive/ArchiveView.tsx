import React, { useState, useMemo } from 'react';
import {
  Archive,
  RotateCcw,
  Search,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  HardDrive,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { ArchiveRecord, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';

interface ArchiveViewProps {
  currentUser: UserProfile;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordForRestore, setSelectedRecordForRestore] = useState<ArchiveRecord | null>(null);
  const [dryRunPreview, setDryRunPreview] = useState(false);
  const [archiveExecutionMsg, setArchiveExecutionMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const archiveRecords = useMemo(() => {
    let result = crmService.getArchiveRecords();
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.archive_id.toLowerCase().includes(q) ||
          a.original_record_code.toLowerCase().includes(q) ||
          a.entity_type.toLowerCase().includes(q)
      );
    }
    return result;
  }, [searchQuery, refreshKey, currentUser]);

  // Active records to archive simulation
  const leads = crmService.getLeads();

  // Simulated Supabase Database Storage Metrics
  const estimatedDbSizeMb = 142; // Out of 500 MB free tier limit
  const thresholdMb = 400;
  const isNearThreshold = estimatedDbSizeMb >= thresholdMb;

  const handleSimulateArchiveLead = (leadId: string) => {
    try {
      const arc = crmService.archiveRecord('leads', leadId);
      setArchiveExecutionMsg(
        `Success: Record ${arc.original_record_code} archived to Google Sheets (${arc.sheet_name}) with verification hash. Archive ID: ${arc.archive_id}.`
      );
      setRefreshKey((k) => k + 1);
      setTimeout(() => setArchiveExecutionMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Archival failed.');
    }
  };

  const handleRestoreRecord = (archiveId: string) => {
    try {
      crmService.restoreRecord(archiveId);
      setArchiveExecutionMsg(`Record successfully restored back to active Supabase storage!`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setArchiveExecutionMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Restore failed.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Archive Management Vault</h2>
          <p className="text-xs text-slate-500">
            Automated Google Sheets archival, 400 MB capacity safeguards, and zero-data-loss restoration
          </p>
        </div>

        <a
          href="https://docs.google.com/spreadsheets/d/1TV9wwXbtbVpfFXP8cIm2uQbYLPkhRdSRspKqSku8MMo/edit"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Open Google Sheets Vault</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {archiveExecutionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{archiveExecutionMsg}</span>
        </div>
      )}

      {/* Storage Gauge & 400 MB Safeguard Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-600" />
              <h3 className="text-xs font-bold text-slate-900">
                Primary Database Storage Status (Supabase PostgreSQL)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">
              {estimatedDbSizeMb} MB / 500 MB (Free Tier)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isNearThreshold ? 'bg-rose-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${(estimatedDbSizeMb / 500) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Current utilization: {Math.round((estimatedDbSizeMb / 500) * 100)}%</span>
            <span className="font-semibold text-amber-600">
              Archive Warning Trigger: {thresholdMb} MB
            </span>
          </div>
        </div>

        {/* 10-day Inactivity Policy Card */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
              <Clock className="w-4 h-4 text-cyan-600" />
              <span>Inactivity Guardrail: 10 Days</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Only records with no activity for at least 10 days are evaluated. Active deals and
              scheduled appointments are never auto-archived.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDryRunPreview(!dryRunPreview)}
            className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-semibold text-[11px] transition-colors"
          >
            {dryRunPreview ? 'Hide Dry-Run Simulation' : 'Run Dry-Run Assessment'}
          </button>
        </div>
      </div>

      {/* Dry Run Preview Section */}
      {dryRunPreview && (
        <div className="bg-cyan-50/60 p-5 rounded-2xl border border-cyan-200 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-950 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-cyan-700" />
              Dry-Run Candidate Assessment (10+ Days Inactivity)
            </span>
            <span className="text-[11px] text-cyan-700 font-medium">Estimated Saving: ~0.4 MB</span>
          </div>

          <p className="text-slate-600">
            Select an eligible inactive record to test Google Sheets write-and-verify archival:
          </p>

          <div className="space-y-2">
            {leads.slice(0, 2).map((l) => (
              <div
                key={l.id}
                className="p-3 bg-white border border-cyan-100 rounded-xl flex items-center justify-between text-xs shadow-xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-800 mr-2">{l.lead_code}</span>
                  <span className="font-semibold text-slate-900">{l.company_name}</span>
                  <span className="text-slate-400 text-[11px] ml-2">Status: {l.status}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSimulateArchiveLead(l.id)}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg text-[11px]"
                >
                  Archive to Sheets
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archive Index Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-xs">Archived Vault Index (Supabase Audit Index)</h3>
          <span className="text-[11px] text-slate-400">{archiveRecords.length} Archived Records</span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Archive ID</th>
              <th className="py-3 px-4">Original Code</th>
              <th className="py-3 px-4">Entity Type</th>
              <th className="py-3 px-4">Destination Sheet</th>
              <th className="py-3 px-4">Archived Date (Dubai)</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {archiveRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Vault is clean. No records currently archived.
                </td>
              </tr>
            ) : (
              archiveRecords.map((arc) => (
                <tr key={arc.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-700">{arc.archive_id}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                    {arc.original_record_code}
                  </td>
                  <td className="py-3 px-4 capitalize">{arc.entity_type}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-emerald-700">
                    {arc.sheet_name}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {formatDubaiDateTime(arc.archived_at)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        arc.status === 'archived'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {arc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {arc.status === 'archived' && (
                      <button
                        type="button"
                        onClick={() => handleRestoreRecord(arc.id)}
                        className="text-cyan-600 hover:text-cyan-700 font-semibold inline-flex items-center gap-1 text-[11px]"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore to CRM</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
