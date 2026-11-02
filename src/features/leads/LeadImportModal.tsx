import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  ArrowRight,
  Building2,
  Kanban,
  MapPin,
  Clock,
  Trash2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Lead, LeadStatus, ModuleKey, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: UserProfile;
  onNavigateToModule?: (module: ModuleKey) => void;
}

interface ParsedLeadRow {
  company_name: string;
  contact_name: string;
  job_title: string;
  industry: string;
  phone: string;
  email: string;
  emirate_state: string;
  city: string;
  address: string;
  website: string;
  linkedin_url: string;
  lead_source: string;
  priority: Lead['priority'];
  status: LeadStatus;
  details: string;
}

const SAMPLE_CSV_CONTENT = `Company Name,Contact Person,Job Title,Industry,Phone,Email,Emirate,City,Address,Website,LinkedIn,Lead Source,Priority,Status,Lead Details (DTLs)
"Al-Futtaim Logistics Division","Tariq Al-Mansoor","VP Supply Chain Analytics","Logistics & Supply Chain","+971 50 482 9100","t.almansoor@alfuttaim-logistics.ae","Dubai","JAFZA South","Plot S204, Jebel Ali Free Zone","https://alfuttaim.com","https://linkedin.com/company/alfuttaim","Referral","urgent","Qualified","Enterprise Power BI warehouse telemetry & real-time fleet KPI command centre across 14 UAE distribution hubs"
"ADNOC Offshore Services","Eng. Fatima Al-Zaabi","Head of Digital Operations","Oil & Gas Services","+971 52 910 3341","f.alzaabi@adnoc-offshore.ae","Abu Dhabi","Corniche West","ADNOC HQ Tower, Level 18","https://adnoc.ae","https://linkedin.com/company/adnoc","Direct Outbound","high","Meeting","Automated drilling rig operational reporting, HSE compliance dashboards, and SAP data lake integration"
"Emaar Hospitality Group","Rashid Bin Sulayem","Director of Business Intelligence","Hospitality & Leisure","+971 55 319 7720","r.sulayem@emaarhospitality.ae","Dubai","Downtown Dubai","Boulevard Plaza Tower 1","https://emaar.com","https://linkedin.com/company/emaar","LinkedIn","high","Connected","Multi-property guest occupancy forecasting, F&B margin analytics, and executive mobile BI scorecards"`;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizePriority(val?: string): Lead['priority'] {
  const clean = (val || '').toLowerCase().trim();
  if (clean === 'urgent') return 'urgent';
  if (clean === 'high') return 'high';
  if (clean === 'low') return 'low';
  return 'medium';
}

function normalizeStatus(val?: string): LeadStatus {
  const clean = (val || '').toLowerCase().trim();
  if (clean === 'connected') return 'Connected';
  if (clean === 'qualified') return 'Qualified';
  if (clean === 'meeting' || clean === 'scoping meeting') return 'Meeting';
  if (clean === 'proposal' || clean === 'proposal sent') return 'Proposal Sent';
  if (clean === 'follow-up' || clean === 'follow-up required') return 'Follow-up Required';
  if (clean === 'won' || clean === 'closed won') return 'Won';
  if (clean === 'lost' || clean === 'closed lost') return 'Lost';
  return 'New';
}

export function parseLeadCSV(rawText: string): ParsedLeadRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const rawHeaders = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  const usedIndices = new Set<number>();
  const findCol = (candidates: string[]): number => {
    // 1. Try exact match first
    const exactIdx = rawHeaders.findIndex(
      (h, idx) => !usedIndices.has(idx) && candidates.includes(h)
    );
    if (exactIdx !== -1) {
      usedIndices.add(exactIdx);
      return exactIdx;
    }
    // 2. Fallback to substring match on unclaimed columns
    const subIdx = rawHeaders.findIndex(
      (h, idx) => !usedIndices.has(idx) && candidates.some((c) => h.includes(c))
    );
    if (subIdx !== -1) {
      usedIndices.add(subIdx);
    }
    return subIdx;
  };

  const idxCompany = findCol(['companyname', 'company', 'organization', 'account', 'client']);
  const idxContact = findCol([
    'contactperson',
    'contactname',
    'contact',
    'person',
    'decisionmaker',
    'fullname',
  ]);
  const idxTitle = findCol(['jobtitle', 'title', 'role', 'designation', 'position']);
  const idxIndustry = findCol(['industry', 'sector', 'vertical']);
  const idxPhone = findCol(['primaryphone', 'phone', 'mobile', 'tel', 'whatsapp']);
  const idxEmail = findCol(['primaryemail', 'email', 'mail']);
  const idxEmirate = findCol(['emirate', 'state', 'region']);
  const idxCity = findCol(['city', 'district', 'area']);
  const idxAddress = findCol(['address', 'building', 'street', 'location']);
  const idxWebsite = findCol(['website', 'web', 'domain', 'url']);
  const idxLinkedin = findCol(['linkedin']);
  const idxSource = findCol(['leadsource', 'source', 'channel']);
  const idxPriority = findCol(['priority', 'urgency']);
  const idxStatus = findCol(['status', 'stage', 'pipelinestage']);
  const idxDetails = findCol(['leaddetailsdtls', 'details', 'dtls', 'requirements', 'scope', 'description', 'notes']);

  const parsed: ParsedLeadRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.every((c) => !c)) continue;

    const companyName = (idxCompany >= 0 ? cols[idxCompany] : cols[0]) || '';
    if (!companyName.trim()) continue;

    const contactName = (idxContact >= 0 ? cols[idxContact] : cols[1]) || 'Primary Contact';

    parsed.push({
      company_name: companyName.replace(/^'+/, '').trim(),
      contact_name: contactName.replace(/^'+/, '').trim(),
      job_title: (idxTitle >= 0 ? cols[idxTitle] : cols[2]) || 'Decision Maker',
      industry: (idxIndustry >= 0 ? cols[idxIndustry] : 'Logistics & Supply Chain') || 'Logistics & Supply Chain',
      phone: (idxPhone >= 0 ? cols[idxPhone] : '+971 50 000 0000') || '+971 50 000 0000',
      email: (idxEmail >= 0 ? cols[idxEmail] : '') || '',
      emirate_state: (idxEmirate >= 0 ? cols[idxEmirate] : 'Dubai') || 'Dubai',
      city: (idxCity >= 0 ? cols[idxCity] : 'Dubai') || 'Dubai',
      address: (idxAddress >= 0 ? cols[idxAddress] : '') || '',
      website: (idxWebsite >= 0 ? cols[idxWebsite] : '') || '',
      linkedin_url: (idxLinkedin >= 0 ? cols[idxLinkedin] : '') || '',
      lead_source: (idxSource >= 0 ? cols[idxSource] : 'Direct Outbound') || 'Direct Outbound',
      priority: normalizePriority(idxPriority >= 0 ? cols[idxPriority] : 'medium'),
      status: normalizeStatus(idxStatus >= 0 ? cols[idxStatus] : 'New'),
      details: (idxDetails >= 0 ? cols[idxDetails] : '') || '',
    });
  }

  return parsed;
}

export const LeadImportModal: React.FC<LeadImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNavigateToModule,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    companiesCreated: number;
    companiesSynced: number;
    visitsCreated: number;
    followUpsCreated: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleParseText = (text: string, sourceLabel?: string) => {
    setErrorMsg(null);
    setCsvText(text);
    if (sourceLabel) setFileName(sourceLabel);
    const rows = parseLeadCSV(text);
    if (rows.length === 0 && text.trim().length > 0) {
      setErrorMsg(
        'No valid lead rows detected. Ensure the first line has column headers (e.g., Company Name, Contact Person, Phone, Email, Lead Details (DTLs)) followed by data rows.'
      );
    }
    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = String(evt.target?.result || '');
      handleParseText(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'DAVIZ_Master_Leads_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadSampleData = () => {
    handleParseText(SAMPLE_CSV_CONTENT, 'UAE_Enterprise_Master_Leads_Sample.csv');
  };

  const handleRemoveRow = (idx: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;

    const result = crmService.importLeads(parsedRows);
    setImportResult({
      importedCount: result.importedLeads.length,
      companiesCreated: result.companiesCreated,
      companiesSynced: result.companiesSynced,
      visitsCreated: result.visitsCreated,
      followUpsCreated: result.followUpsCreated,
    });
    onSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">
                  Import Master Leads (CSV / Spreadsheet)
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Master Table
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Enter company & contact details in Leads first — records automatically split out to Sales Pipeline, Companies, Client Visits, and Follow-ups
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs overflow-y-auto flex-1">
          {/* Master Table Auto-Split Architecture Strip */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="px-2 py-0.5 rounded bg-[#0B132B] text-cyan-400 font-mono text-[10px]">
                1. MASTER LEADS (LD)
              </span>
              <span>Single Source of Truth</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-slate-600 font-medium">
              <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                <Kanban className="w-3 h-3 text-cyan-600" /> Sales Pipeline
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                <Building2 className="w-3 h-3 text-indigo-600" /> Companies (CP)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                <MapPin className="w-3 h-3 text-purple-600" /> Client Visits (VS)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                <Clock className="w-3 h-3 text-amber-600" /> Follow-ups (FU)
              </span>
            </div>
          </div>

          {importResult ? (
            /* Post-Import Split-Out Confirmation View */
            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Master Leads Imported & Split Out Successfully
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  All company details, contacts, and DTLs have been propagated across your CRM modules.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Master Leads & Pipeline
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-cyan-700 mt-1 block">
                    +{importResult.importedCount}
                  </span>
                  <span className="text-[10px] text-slate-500">Onboarded in stages</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Companies Split Out
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-indigo-700 mt-1 block">
                    +{importResult.companiesCreated}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {importResult.companiesSynced} accounts linked
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Client Visits Split Out
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-purple-700 mt-1 block">
                    +{importResult.visitsCreated}
                  </span>
                  <span className="text-[10px] text-slate-500">Scheduled with DTLs</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Follow-ups Queued
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-amber-600 mt-1 block">
                    +{importResult.followUpsCreated}
                  </span>
                  <span className="text-[10px] text-slate-500">Active outreach tasks</span>
                </div>
              </div>

              {onNavigateToModule && (
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToModule('pipeline');
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Kanban className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Open Sales Pipeline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToModule('companies');
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>View Companies</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToModule('visits');
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <span>View Client Visits</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToModule('follow_ups');
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>View Follow-ups</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Upload Zone & Quick Template Actions */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-full border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-xl p-5 bg-slate-50/60 hover:bg-cyan-50/20 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-cyan-600">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        {fileName ? `Loaded: ${fileName}` : 'Click to Upload Leads CSV File'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Supports .CSV files exported from Excel, Google Sheets, or Zoho CRM
                      </p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 flex flex-col justify-between gap-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">
                      CSV Template & Quick Sample
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Columns: Company Name, Contact Person, Job Title, Industry, Phone, Email, Emirate, City, Stage, and Lead Details (DTLs).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex-1 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sample CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadSampleData}
                      className="flex-1 px-3 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Load Sample Rows</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Paste CSV Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">
                    Or Paste CSV / Spreadsheet Rows Directly
                  </label>
                  {csvText && (
                    <button
                      type="button"
                      onClick={() => {
                        setCsvText('');
                        setParsedRows([]);
                        setFileName(null);
                        setErrorMsg(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-600"
                    >
                      Clear Data
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={csvText}
                  onChange={(e) => handleParseText(e.target.value, 'Pasted Spreadsheet Data')}
                  placeholder={`Company Name,Contact Person,Job Title,Industry,Phone,Email,Emirate,City,Status,Lead Details (DTLs)\n"Emirates Logistics","Tariq Al-Mansoor","VP Operations","Logistics & Supply Chain","+971 50 482 9100","tariq@company.ae","Dubai","JAFZA","Qualified","Enterprise BI dashboard requirements"`}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-[11px] outline-none focus:border-cyan-500 bg-slate-50/40 focus:bg-white"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Parsed Rows Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Preview Master Leads to Import ({parsedRows.length} Records)
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Will auto-split into Pipeline, Companies, Client Visits & Follow-ups
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Company Name</th>
                          <th className="py-2.5 px-3">Contact Person</th>
                          <th className="py-2.5 px-3">Phone & Email</th>
                          <th className="py-2.5 px-3">Location</th>
                          <th className="py-2.5 px-3">Stage</th>
                          <th className="py-2.5 px-3">Lead Details (DTLs)</th>
                          <th className="py-2.5 px-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900 block">
                                {row.company_name}
                              </span>
                              <span className="text-[10px] text-slate-400">{row.industry}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold text-slate-800 block">
                                {row.contact_name}
                              </span>
                              <span className="text-[10px] text-slate-400">{row.job_title}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-mono text-slate-700 block">{row.phone}</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[130px] block">
                                {row.email}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {row.city}, {row.emirate_state}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold text-[10px]">
                                {row.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 max-w-[200px]">
                              <span className="line-clamp-2 text-slate-600">
                                {row.details || '—'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Remove row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-[11px] text-slate-500">
            {importResult
              ? 'All records audited in Activity Logs.'
              : `${parsedRows.length} lead row(s) ready for master import`}
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200/60 rounded-lg font-semibold transition-colors"
            >
              {importResult ? 'Done & View Leads' : 'Cancel'}
            </button>

            {!importResult && (
              <button
                type="button"
                disabled={parsedRows.length === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-[#0B132B] hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Import {parsedRows.length > 0 ? `${parsedRows.length} ` : ''}Leads & Split Out
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
