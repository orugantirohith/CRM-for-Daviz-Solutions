import React, { useState, useMemo } from 'react';
import {
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  Users,
  Building2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Kanban,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Lead, LeadStatus, ModuleKey, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { hasPermission, filterRecordsByScope } from '../../lib/permissions/permissionCheck';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ActionColumn } from '../../components/ui/ActionColumn';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LeadFormModal } from './LeadFormModal';
import { LeadDetailModal } from './LeadDetailModal';
import { StatusChangeModal } from './StatusChangeModal';
import { LeadImportModal } from './LeadImportModal';

interface LeadListViewProps {
  currentUser: UserProfile;
  onNavigateToModule?: (module: ModuleKey) => void;
}

export const LeadListView: React.FC<LeadListViewProps> = ({
  currentUser,
  onNavigateToModule,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const [selectedLeadForStatus, setSelectedLeadForStatus] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const canCreate = hasPermission('leads', 'create', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
  });

  const canEdit = hasPermission('leads', 'edit', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
  });

  const canDelete = hasPermission('leads', 'delete', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
  });

  const canExport = hasPermission('leads', 'export', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
  });

  const allUsers = useMemo(() => crmService.getUsers(), []);

  const isAgent = currentUser.role_id === 'sales_agent';
  const effectiveAgentFilter = isAgent ? currentUser.id : agentFilter;

  const leads = useMemo(() => {
    const raw = crmService.getLeads({
      assignedTo: effectiveAgentFilter,
      status: statusFilter === 'all' ? undefined : (statusFilter as LeadStatus),
      search: searchQuery,
    });
    return filterRecordsByScope(raw, currentUser, 'leads');
  }, [effectiveAgentFilter, statusFilter, searchQuery, refreshKey, currentUser]);

  // Lead KPI counts computed strictly on scoped leads
  const scopedAllLeads = useMemo(() => {
    const raw = crmService.getLeads();
    return filterRecordsByScope(raw, currentUser, 'leads');
  }, [refreshKey, currentUser]);

  const kpiNew = scopedAllLeads.filter((l) => l.status === 'New').length;
  const kpiConnected = scopedAllLeads.filter((l) => l.status === 'Connected').length;
  const kpiQualified = scopedAllLeads.filter((l) => l.status === 'Qualified').length;
  const kpiMeeting = scopedAllLeads.filter((l) => l.status === 'Meeting').length;
  const kpiProposal = scopedAllLeads.filter((l) => l.status === 'Proposal Sent').length;
  const kpiWon = scopedAllLeads.filter((l) => l.status === 'Won').length;

  const handleStatusChangeSubmit = (newStatus: LeadStatus, note: string) => {
    if (!selectedLeadForStatus) return;
    crmService.updateLeadStatus(selectedLeadForStatus.id, newStatus, note);
    setRefreshKey((k) => k + 1);
    if (selectedLeadForDetail && selectedLeadForDetail.id === selectedLeadForStatus.id) {
      setSelectedLeadForDetail(crmService.getLeadById(selectedLeadForStatus.id) || null);
    }
  };

  const handleConfirmDelete = () => {
    if (!leadToDelete) return;
    crmService.deleteLead(leadToDelete.id);
    setLeadToDelete(null);
    setRefreshKey((k) => k + 1);
  };

  const handleExportCSV = () => {
    if (!canExport) {
      alert('Permission Denied: You do not have permission to export CRM leads.');
      return;
    }

    // Protect against spreadsheet formula injection (=, +, -, @)
    const sanitize = (val: string | number | undefined | null) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(str)) {
        return `"'${str}"`;
      }
      return `"${str}"`;
    };

    const headers = [
      'Lead Code',
      'Company Name',
      'Contact Person',
      'Job Title',
      'Industry',
      'Status',
      'Priority',
      'Lead Source',
      'Lead Details (DTLs)',
      'Assigned Agent',
      'Emirate',
      'City',
      'Primary Phone',
      'Primary Email',
      'Created Date',
    ];

    const rows = leads.map((l) => [
      sanitize(l.lead_code),
      sanitize(l.company_name),
      sanitize(l.contact_name),
      sanitize(l.job_title),
      sanitize(l.industry),
      sanitize(l.status),
      sanitize(l.priority),
      sanitize(l.lead_source),
      sanitize(l.details || ''),
      sanitize(l.assigned_user_name || ''),
      sanitize(l.emirate_state),
      sanitize(l.city),
      sanitize(l.phones[0]?.phone_number || ''),
      sanitize(l.emails[0]?.email || ''),
      sanitize(formatDubaiDateTime(l.created_at, false)),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DAVIZ_Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    crmService.logActivity({
      action: 'EXPORT',
      module: 'leads',
      result: 'Success',
      description: `User ${currentUser.display_name} exported ${leads.length} leads to CSV.`,
    });
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Leads & Opportunities
            </h2>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
              Master Table
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter company & contact details here first — records automatically split out to Sales Pipeline, Companies, Client Visits, and Follow-ups
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToModule && (
            <button
              type="button"
              onClick={() => onNavigateToModule('pipeline')}
              className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Kanban className="w-3.5 h-3.5 text-cyan-600" />
              <span>Sales Pipeline</span>
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 border border-cyan-300 bg-cyan-50/70 hover:bg-cyan-100/80 text-cyan-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-700" />
              <span>Import Leads</span>
            </button>
          )}

          {canExport && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[#0B132B] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>New Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Stages KPI Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {[
          { label: 'New', count: kpiNew, color: 'text-blue-600', bg: 'bg-blue-50/50' },
          { label: 'Connected', count: kpiConnected, color: 'text-cyan-600', bg: 'bg-cyan-50/50' },
          { label: 'Qualified', count: kpiQualified, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
          { label: 'Meeting', count: kpiMeeting, color: 'text-purple-600', bg: 'bg-purple-50/50' },
          { label: 'Proposal', count: kpiProposal, color: 'text-amber-600', bg: 'bg-amber-50/50' },
          { label: 'Won', count: kpiWon, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            onClick={() => setStatusFilter(kpi.label === 'Proposal' ? 'Proposal Sent' : kpi.label)}
            className={`p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-white hover:border-cyan-400 transition-all cursor-pointer shadow-xs ${
              statusFilter === kpi.label ? 'ring-1 ring-cyan-500' : ''
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
              {kpi.label}
            </span>
            <span className={`text-lg sm:text-xl font-bold mt-0.5 sm:mt-1 block ${kpi.color}`}>
              {kpi.count}
            </span>
          </div>
        ))}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 min-w-[200px] max-w-sm relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by code, company, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium text-[11px]">Stage:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 text-xs"
            >
              <option value="all">All Stages</option>
              <option value="New">New</option>
              <option value="Connected">Connected</option>
              <option value="Qualified">Qualified</option>
              <option value="Meeting">Meeting</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          {/* Agent Filter (Admin/Manager) */}
          {(currentUser.role_id === 'admin' || currentUser.role_id === 'sales_manager') && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-[11px]">Agent:</span>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 text-xs"
              >
                <option value="all">All Team</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(statusFilter !== 'all' || agentFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setAgentFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] text-cyan-600 hover:underline font-medium min-h-[40px] px-2 flex items-center"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card Stack (Screens < 768px) */}
      <div className="md:hidden space-y-3">
        {leads.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs shadow-xs">
            No leads found matching your criteria.
          </div>
        ) : (
          leads.map((lead) => {
            const primaryPhone = lead.phones[0]?.phone_number;
            const primaryEmail = lead.emails[0]?.email;
            return (
              <div
                key={lead.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                {/* Header: Code + Status Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-cyan-700 px-2 py-0.5 rounded border border-slate-200">
                    {lead.lead_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedLeadForStatus(lead)}
                    title="Change stage with progress note"
                    className="cursor-pointer"
                  >
                    <StatusBadge status={lead.status} size="sm" />
                  </button>
                </div>

                {/* Company & Contact */}
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedLeadForDetail(lead)}
                    className="font-bold text-slate-900 hover:text-cyan-600 text-left text-sm block"
                  >
                    {lead.company_name}
                  </button>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {lead.contact_name} {lead.job_title ? `• ${lead.job_title}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{lead.industry}</p>
                </div>

                {/* Lead DTLs & Location */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Lead Details (DTLs)
                    </span>
                    <span className="text-slate-700 font-medium text-[11px]">
                      {lead.city}, {lead.emirate_state}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 line-clamp-2">
                    {lead.details?.trim() || `${lead.lead_source} • Priority: ${lead.priority}`}
                  </p>
                </div>

                {/* Footer with Agent and Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500">
                    Agent: <strong className="text-slate-700">{lead.assigned_user_name || 'Agent'}</strong>
                  </div>

                  <ActionColumn
                    websiteUrl={lead.website}
                    linkedinUrl={lead.linkedin_url}
                    phoneNumber={primaryPhone}
                    recordTitle={lead.company_name}
                    onView={() => setSelectedLeadForDetail(lead)}
                    onEdit={canEdit ? () => setSelectedLeadForEdit(lead) : undefined}
                    onDelete={canDelete ? () => setLeadToDelete(lead) : undefined}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop & Tablet Leads Table (Screens >= 768px) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Lead ID</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Primary Contact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status & Stage</th>
                <th className="py-3 px-4">Details (DTLs)</th>
                <th className="py-3 px-4">Assigned Agent</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const primaryPhone = lead.phones[0]?.phone_number;
                  const primaryEmail = lead.emails[0]?.email;
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-cyan-700">
                        {lead.lead_code}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadForDetail(lead)}
                          className="font-bold text-slate-900 hover:text-cyan-600 text-left transition-colors truncate max-w-[180px] block"
                        >
                          {lead.company_name}
                        </button>
                        <span className="text-[10px] text-slate-400 block">{lead.industry}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {lead.contact_name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                          {lead.job_title}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        <span className="font-mono text-slate-700 block">{primaryPhone || '—'}</span>
                        <span className="text-slate-400 truncate max-w-[140px] block">
                          {primaryEmail || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        <span className="font-medium text-slate-800 block">
                          {lead.city}, {lead.emirate_state}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedLeadForStatus(lead)}
                          title="Click to change status with mandatory progress note"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <StatusBadge status={lead.status} size="sm" />
                        </button>
                      </td>

                      <td className="py-3 px-4 max-w-[200px]">
                        <span className="text-slate-700 text-[11px] line-clamp-2 block">
                          {lead.details?.trim() || `${lead.lead_source}`}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          Priority: {lead.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[11px] font-medium text-slate-800">
                          {lead.assigned_user_name || 'Agent'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <ActionColumn
                          websiteUrl={lead.website}
                          linkedinUrl={lead.linkedin_url}
                          phoneNumber={primaryPhone}
                          recordTitle={lead.company_name}
                          onView={() => setSelectedLeadForDetail(lead)}
                          onEdit={canEdit ? () => setSelectedLeadForEdit(lead) : undefined}
                          onDelete={canDelete ? () => setLeadToDelete(lead) : undefined}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isImportModalOpen && (
        <LeadImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          currentUser={currentUser}
          onNavigateToModule={onNavigateToModule}
        />
      )}

      {isCreateModalOpen && (
        <LeadFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          currentUser={currentUser}
        />
      )}

      {selectedLeadForEdit && (
        <LeadFormModal
          isOpen={Boolean(selectedLeadForEdit)}
          initialLead={selectedLeadForEdit}
          onClose={() => setSelectedLeadForEdit(null)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          currentUser={currentUser}
        />
      )}

      {selectedLeadForDetail && (
        <LeadDetailModal
          isOpen={Boolean(selectedLeadForDetail)}
          lead={selectedLeadForDetail}
          onClose={() => setSelectedLeadForDetail(null)}
          onOpenStatusModal={() => {
            setSelectedLeadForStatus(selectedLeadForDetail);
          }}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          currentUser={currentUser}
        />
      )}

      {selectedLeadForStatus && (
        <StatusChangeModal
          isOpen={Boolean(selectedLeadForStatus)}
          lead={selectedLeadForStatus}
          onClose={() => setSelectedLeadForStatus(null)}
          onSubmit={handleStatusChangeSubmit}
        />
      )}

      {leadToDelete && (
        <ConfirmDialog
          isOpen={Boolean(leadToDelete)}
          title="Delete Lead Record"
          message={`Are you sure you want to permanently delete lead ${leadToDelete.lead_code} (${leadToDelete.company_name})? This action will be audited in Activity Logs.`}
          confirmLabel="Delete Lead"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setLeadToDelete(null)}
        />
      )}
    </div>
  );
};
