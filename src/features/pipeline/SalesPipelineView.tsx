import React, { useState, useMemo } from 'react';
import {
  Kanban,
  SplitSquareVertical,
  BarChart3,
  Plus,
  Search,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  User,
  History,
  MessageSquare,
  ExternalLink,
  SlidersHorizontal,
  Edit3,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Lead, LeadStatus, ModuleKey, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { hasPermission } from '../../lib/permissions/permissionCheck';
import { formatDubaiDateTime, formatWhatsAppLink } from '../../lib/dates/dubaiDate';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LeadFormModal } from '../leads/LeadFormModal';
import { LeadDetailModal } from '../leads/LeadDetailModal';
import { StatusChangeModal } from '../leads/StatusChangeModal';

interface SalesPipelineViewProps {
  currentUser: UserProfile;
  onNavigateToModule?: (module: ModuleKey) => void;
}

const PIPELINE_STAGES: {
  status: LeadStatus;
  label: string;
  shortDesc: string;
  headerAccent: string;
  badgeBg: string;
  barColor: string;
}[] = [
  {
    status: 'New',
    label: 'New Inbound',
    shortDesc: 'Initial discovery & qualification pending',
    headerAccent: 'border-t-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    barColor: 'bg-blue-600',
  },
  {
    status: 'Connected',
    label: 'Connected',
    shortDesc: 'First outreach completed with stakeholder',
    headerAccent: 'border-t-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    barColor: 'bg-cyan-600',
  },
  {
    status: 'Qualified',
    label: 'Qualified',
    shortDesc: 'Verified DTLs & technical fit confirmed',
    headerAccent: 'border-t-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    barColor: 'bg-indigo-600',
  },
  {
    status: 'Meeting',
    label: 'Scoping Meeting',
    shortDesc: 'Architecture workshop or on-site visit',
    headerAccent: 'border-t-violet-600',
    badgeBg: 'bg-violet-50 text-violet-700 border-violet-200',
    barColor: 'bg-violet-600',
  },
  {
    status: 'Proposal Sent',
    label: 'Proposal Sent',
    shortDesc: 'Technical scope & deliverables submitted',
    headerAccent: 'border-t-amber-500',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    barColor: 'bg-amber-500',
  },
  {
    status: 'Follow-up Required',
    label: 'Follow-up Due',
    shortDesc: 'Awaiting client response or next touchpoint',
    headerAccent: 'border-t-orange-500',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
    barColor: 'bg-orange-500',
  },
  {
    status: 'Won',
    label: 'Closed Won',
    shortDesc: 'Approved & onboarded client engagement',
    headerAccent: 'border-t-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    barColor: 'bg-emerald-600',
  },
  {
    status: 'Lost',
    label: 'Closed Lost',
    shortDesc: 'Deferred or inactive opportunity',
    headerAccent: 'border-t-rose-500',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    barColor: 'bg-rose-500',
  },
];

const NEXT_STAGE_MAP: Partial<Record<LeadStatus, LeadStatus>> = {
  New: 'Connected',
  Connected: 'Qualified',
  Qualified: 'Meeting',
  Meeting: 'Proposal Sent',
  'Proposal Sent': 'Won',
  'Follow-up Required': 'Meeting',
};

export const SalesPipelineView: React.FC<SalesPipelineViewProps> = ({
  currentUser,
  onNavigateToModule,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'blueprint' | 'analytics'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [focusedStage, setFocusedStage] = useState<LeadStatus | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Drag & drop state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStatus | null>(null);

  // Blueprint inspector selected lead
  const [inspectedLeadId, setInspectedLeadId] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const [statusTransitionTarget, setStatusTransitionTarget] = useState<{
    lead: Lead;
    suggestedStatus?: LeadStatus;
  } | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  const canCreate = hasPermission('pipeline', 'create', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
  });
  const canEdit = hasPermission('pipeline', 'edit', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
  });
  const canDelete = hasPermission('pipeline', 'delete', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
  });

  const allUsers = useMemo(() => crmService.getUsers(), [refreshKey]);

  const filteredLeads = useMemo(() => {
    let list = crmService.getLeads({
      assignedTo: agentFilter,
      search: searchQuery,
    });
    if (priorityFilter !== 'all') {
      list = list.filter((l) => l.priority === priorityFilter);
    }
    return list;
  }, [agentFilter, priorityFilter, searchQuery, refreshKey, currentUser]);

  const visibleStages = useMemo(() => {
    if (focusedStage === 'all') return PIPELINE_STAGES;
    return PIPELINE_STAGES.filter((s) => s.status === focusedStage);
  }, [focusedStage]);

  const inspectedLead = useMemo(() => {
    if (inspectedLeadId) {
      const found = filteredLeads.find((l) => l.id === inspectedLeadId);
      if (found) return found;
    }
    return filteredLeads[0] || null;
  }, [inspectedLeadId, filteredLeads]);

  // Trigger stage change modal (from Drag & Drop, Quick Advance, or Blueprint click)
  const initiateStageTransition = (lead: Lead, targetStatus?: LeadStatus) => {
    if (!canEdit) return;
    if (targetStatus && lead.status === targetStatus) return;
    setStatusTransitionTarget({ lead, suggestedStatus: targetStatus });
  };

  const handleStatusChangeSubmit = (newStatus: LeadStatus, note: string) => {
    if (!statusTransitionTarget) return;
    crmService.updateLeadStatus(statusTransitionTarget.lead.id, newStatus, note);
    setStatusTransitionTarget(null);
    setRefreshKey((k) => k + 1);
    if (
      selectedLeadForDetail &&
      selectedLeadForDetail.id === statusTransitionTarget.lead.id
    ) {
      setSelectedLeadForDetail(crmService.getLeadById(statusTransitionTarget.lead.id) || null);
    }
  };

  const handleQuickAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectedLead || !quickNoteText.trim()) return;
    crmService.addLeadNote(inspectedLead.id, quickNoteText.trim());
    setQuickNoteText('');
    setRefreshKey((k) => k + 1);
  };

  const handleConfirmDelete = () => {
    if (!leadToDelete) return;
    crmService.deleteLead(leadToDelete.id);
    setLeadToDelete(null);
    setRefreshKey((k) => k + 1);
  };

  const totalCount = filteredLeads.length;
  const activeCount = filteredLeads.filter(
    (l) => l.status !== 'Won' && l.status !== 'Lost'
  ).length;
  const wonCount = filteredLeads.filter((l) => l.status === 'Won').length;
  const highPriorityCount = filteredLeads.filter(
    (l) => l.priority === 'urgent' || l.priority === 'high'
  ).length;

  return (
    <div className="space-y-4 animate-crm-view">
      {/* Top Enterprise Header & View Switcher */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-cyan-700">Sales Execution</span>
            <span aria-hidden="true">·</span>
            <span>Stage Blueprint & Visual Kanban</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700 font-semibold">
              {totalCount} Total ({activeCount} Open · {wonCount} Won · {highPriorityCount} High/Urgent)
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Sales Pipeline & Blueprint
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Mode Switcher (Zoho Canvas / Blueprint / Matrix) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-cyan-600" />
              <span>Kanban Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('blueprint')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                viewMode === 'blueprint'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5 text-cyan-600" />
              <span>Blueprint Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('analytics')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                viewMode === 'analytics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-cyan-600" />
              <span>Stage Analytics</span>
            </button>
          </div>

          {onNavigateToModule && (
            <button
              type="button"
              onClick={() => onNavigateToModule('leads')}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              List View
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[#0B132B] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>New Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Zoho-Style Interactive Stage Chevron Ribbon */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-[780px]">
          <button
            type="button"
            onClick={() => setFocusedStage('all')}
            className={`px-3 py-2 rounded-lg text-left transition-all shrink-0 border ${
              focusedStage === 'all'
                ? 'bg-[#0B132B] text-white border-[#0B132B]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span className="text-[10px] font-semibold block opacity-80">All Stages</span>
            <span className="text-sm font-bold font-mono tabular-nums">{totalCount}</span>
          </button>

          {PIPELINE_STAGES.map((stage, idx) => {
            const count = filteredLeads.filter((l) => l.status === stage.status).length;
            const share = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            const isSelected = focusedStage === stage.status;

            return (
              <React.Fragment key={stage.status}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <button
                  type="button"
                  onClick={() =>
                    setFocusedStage(isSelected ? 'all' : stage.status)
                  }
                  className={`flex-1 min-w-[110px] px-3 py-2 rounded-lg text-left transition-all border ${
                    isSelected
                      ? 'bg-cyan-950 text-white border-cyan-700 shadow-xs'
                      : 'bg-slate-50/70 hover:bg-slate-100/80 text-slate-800 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold truncate">
                      {idx + 1}. {stage.label}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono tabular-nums ${
                        isSelected ? 'text-cyan-300' : 'text-slate-900'
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-200/70 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full ${stage.barColor} transition-all duration-300`}
                      style={{ width: `${Math.max(share, count > 0 ? 12 : 0)}%` }}
                    />
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 min-w-[220px] max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter pipeline by code, company, contact, or DTLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {(currentUser.role_id === 'admin' || currentUser.role_id === 'sales_manager') && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Owner:</span>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 font-medium"
              >
                <option value="all">All Team Members</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(searchQuery || priorityFilter !== 'all' || agentFilter !== 'all' || focusedStage !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPriorityFilter('all');
                setAgentFilter('all');
                setFocusedStage('all');
              }}
              className="text-cyan-600 hover:text-cyan-700 font-semibold px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: ZOHO-STYLE KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex items-stretch gap-3.5 min-w-max">
            {visibleStages.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.status === stage.status);
              const isDropTarget = dragOverStage === stage.status;

              return (
                <div
                  key={stage.status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverStage !== stage.status) {
                      setDragOverStage(stage.status);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverStage === stage.status) {
                      setDragOverStage(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverStage(null);
                    if (!draggedLeadId) return;
                    const draggedLead = filteredLeads.find((l) => l.id === draggedLeadId);
                    setDraggedLeadId(null);
                    if (draggedLead && draggedLead.status !== stage.status) {
                      initiateStageTransition(draggedLead, stage.status);
                    }
                  }}
                  className={`w-[305px] shrink-0 rounded-xl bg-slate-100/90 border border-slate-200/90 border-t-4 ${stage.headerAccent} flex flex-col max-h-[calc(100vh-280px)] min-h-[420px] transition-colors ${
                    isDropTarget ? 'ring-2 ring-cyan-500 bg-cyan-50/40' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className="p-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900 truncate">
                          {stage.label}
                        </h3>
                        <span className="font-mono tabular-nums text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {stageLeads.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {stage.shortDesc}
                      </p>
                    </div>

                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        title={`Add Lead`}
                        className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Cards Stack */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                    {stageLeads.length === 0 ? (
                      <div className="h-44 rounded-lg border border-dashed border-slate-300/80 bg-white/50 p-4 flex flex-col items-center justify-center text-center">
                        <p className="text-xs font-semibold text-slate-500">
                          No leads in {stage.label}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Drag a card here or create a new lead to populate this stage.
                        </p>
                        {canCreate && stage.status === 'New' && (
                          <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-3 px-3 py-1.5 bg-white border border-slate-300 hover:border-cyan-500 text-slate-700 hover:text-cyan-700 rounded-lg text-[11px] font-semibold shadow-2xs transition-colors"
                          >
                            + Add First Lead
                          </button>
                        )}
                      </div>
                    ) : (
                      stageLeads.map((lead) => {
                        const primaryPhone = lead.phones[0]?.phone_number;
                        const nextStage = NEXT_STAGE_MAP[lead.status];

                        return (
                          <div
                            key={lead.id}
                            draggable={canEdit}
                            onDragStart={() => setDraggedLeadId(lead.id)}
                            onDragEnd={() => {
                              setDraggedLeadId(null);
                              setDragOverStage(null);
                            }}
                            onClick={() => setSelectedLeadForDetail(lead)}
                            className="bg-white rounded-lg border border-slate-200/90 hover:border-cyan-500/80 p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2.5"
                          >
                            {/* Top Meta Row: Code · Priority */}
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-mono tabular-nums font-bold text-cyan-700">
                                {lead.lead_code}
                              </span>
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <span
                                  className={`font-semibold capitalize ${
                                    lead.priority === 'urgent'
                                      ? 'text-rose-600'
                                      : lead.priority === 'high'
                                      ? 'text-amber-600'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {lead.priority}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate max-w-[90px]">{lead.lead_source}</span>
                              </div>
                            </div>

                            {/* Company & Contact */}
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs group-hover:text-cyan-700 transition-colors line-clamp-1">
                                {lead.company_name}
                              </h4>
                              <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate">
                                {lead.contact_name}
                                {lead.job_title ? ` · ${lead.job_title}` : ''}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {lead.industry} · {lead.city}, {lead.emirate_state}
                              </p>
                            </div>

                            {/* DTLs Snippet (Lead Details & Requirements) */}
                            <div className="p-2 rounded-md bg-slate-50 border border-slate-100 text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {lead.details?.trim()
                                ? lead.details
                                : 'No DTLs entered yet — click to add client requirements.'}
                            </div>

                            {/* Footer: Owner + Quick Actions + Stage Advance */}
                            <div
                              className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center shrink-0 uppercase">
                                  {(lead.assigned_user_name || 'AG').slice(0, 2)}
                                </div>
                                <span className="text-[10px] text-slate-500 truncate">
                                  {lead.assigned_user_name || 'Agent'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {primaryPhone && (
                                  <a
                                    href={formatWhatsAppLink(primaryPhone)}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="WhatsApp Contact"
                                    className="px-1.5 py-1 rounded text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                                  >
                                    WA
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => initiateStageTransition(lead)}
                                  title="Change Stage with Progress Note"
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors"
                                >
                                  Stage
                                </button>

                                {nextStage && canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => initiateStageTransition(lead, nextStage)}
                                    title={`Advance to ${nextStage}`}
                                    className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-semibold flex items-center gap-0.5 transition-colors"
                                  >
                                    <span>Next</span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: ZOHO BLUEPRINT SPLIT INSPECTOR VIEW */}
      {viewMode === 'blueprint' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Record List (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col max-h-[680px]">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Pipeline Records ({filteredLeads.length})
              </span>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-cyan-600 hover:text-cyan-700 font-semibold"
                >
                  + New Lead
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No leads in pipeline yet. Click "+ New Lead" to create your first opportunity.
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = inspectedLead?.id === lead.id;
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setInspectedLeadId(lead.id)}
                      className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-cyan-50/60 border-l-2 border-l-cyan-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono tabular-nums text-[11px] font-bold text-cyan-700">
                          {lead.lead_code}
                        </span>
                        <StatusBadge status={lead.status} size="sm" />
                      </div>
                      <p className="font-bold text-slate-900 text-xs truncate">
                        {lead.company_name}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate">{lead.contact_name}</span>
                        <span className="capitalize">{lead.priority}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Blueprint Workspace (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {!inspectedLead ? (
              <div className="p-12 text-center space-y-3">
                <Kanban className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">
                  No Pipeline Record Selected
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Create a lead or select an opportunity from the left list to inspect its Zoho-style Stage Blueprint, DTLs, and activity history.
                </p>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    + Create First Lead
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200/80">
                {/* Record Header */}
                <div className="p-5 bg-[#0B132B] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="font-mono tabular-nums font-bold text-cyan-400">
                        {inspectedLead.lead_code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{inspectedLead.industry}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">Priority: {inspectedLead.priority}</span>
                    </div>
                    <h2 className="text-lg font-bold text-white">
                      {inspectedLead.company_name}
                    </h2>
                    <p className="text-xs text-slate-300">
                      Primary Contact:{' '}
                      <strong className="text-white">{inspectedLead.contact_name}</strong> (
                      {inspectedLead.job_title || 'Decision Maker'})
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setSelectedLeadForEdit(inspectedLead)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => initiateStageTransition(inspectedLead)}
                      className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Transition Stage</span>
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setLeadToDelete(inspectedLead)}
                        className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Zoho Blueprint Interactive Stage Stepper */}
                <div className="p-4 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">
                      Blueprint Stage Progression (Click any stage to transition with mandatory note)
                    </span>
                    <span className="text-slate-500">
                      Current Stage: <strong className="text-slate-900">{inspectedLead.status}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
                    {PIPELINE_STAGES.map((st) => {
                      const isCurrent = inspectedLead.status === st.status;
                      return (
                        <button
                          key={st.status}
                          type="button"
                          onClick={() => initiateStageTransition(inspectedLead, st.status)}
                          className={`px-2.5 py-2 rounded-lg text-[11px] font-semibold text-center transition-all border truncate ${
                            isCurrent
                              ? 'bg-[#0B132B] text-cyan-300 border-[#0B132B] shadow-2xs'
                              : 'bg-white hover:border-cyan-500 text-slate-600 border-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DTLs & Contact Details */}
                <div className="p-5 space-y-5 text-xs">
                  <div className="p-4 rounded-xl bg-cyan-50/40 border border-cyan-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Lead Details & Client Requirements (DTLs)</span>
                      </h4>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setSelectedLeadForEdit(inspectedLead)}
                          className="text-[11px] text-cyan-700 hover:underline font-semibold"
                        >
                          Update DTLs
                        </button>
                      )}
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {inspectedLead.details?.trim()
                        ? inspectedLead.details
                        : 'No specific project DTLs recorded yet. Click Update DTLs to enter client requirements.'}
                    </p>
                  </div>

                  {/* Contact & Location Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        Direct Phones & WhatsApp
                      </span>
                      {inspectedLead.phones.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="font-mono tabular-nums font-semibold text-slate-800">
                            {p.phone_number}
                          </span>
                          <a
                            href={formatWhatsAppLink(p.phone_number)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-semibold text-emerald-700 hover:underline"
                          >
                            WhatsApp
                          </a>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        Email Channels
                      </span>
                      {inspectedLead.emails.map((em) => (
                        <div key={em.id} className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-slate-800 truncate">{em.email}</span>
                          <a
                            href={`mailto:${em.email}`}
                            className="text-[11px] font-semibold text-cyan-700 hover:underline shrink-0"
                          >
                            Mail
                          </a>
                        </div>
                      ))}
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        UAE Location & Owner
                      </span>
                      <p className="font-semibold text-slate-800">
                        {inspectedLead.city}, {inspectedLead.emirate_state}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Owner: {inspectedLead.assigned_user_name || 'Assigned Agent'} · Source:{' '}
                        {inspectedLead.lead_source}
                      </p>
                    </div>
                  </div>

                  {/* Quick Note & Audit History */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Activity Notes</span>
                      </h4>
                      <form onSubmit={handleQuickAddNote} className="flex gap-2">
                        <input
                          type="text"
                          value={quickNoteText}
                          onChange={(e) => setQuickNoteText(e.target.value)}
                          placeholder="Add quick call or meeting note..."
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 bg-[#0B132B] hover:bg-slate-800 text-white rounded-lg font-semibold shrink-0"
                        >
                          Add
                        </button>
                      </form>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {crmService.getLeadNotes(inspectedLead.id).map((n) => (
                          <div
                            key={n.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-slate-700">{n.author_name}</span>
                              <span className="font-mono tabular-nums">
                                {formatDubaiDateTime(n.created_at)}
                              </span>
                            </div>
                            <p className="text-slate-700">{n.note_text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Stage Transition History</span>
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {crmService.getLeadStatusHistory(inspectedLead.id).map((h) => (
                          <div
                            key={h.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-slate-800">
                                {h.previous_status} → {h.new_status}
                              </span>
                              <span className="font-mono tabular-nums text-slate-400">
                                {formatDubaiDateTime(h.changed_at)}
                              </span>
                            </div>
                            <p className="text-slate-600 italic">"{h.note}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: STAGE ANALYTICS & VELOCITY MATRIX */}
      {viewMode === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Stage Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pipeline Stage Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Record volume and conversion share across all 8 lifecycle stages
              </p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {PIPELINE_STAGES.map((stage) => {
                const count = filteredLeads.filter((l) => l.status === stage.status).length;
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={stage.status} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-[140px]">
                      <span className="font-semibold text-slate-800 block">{stage.label}</span>
                      <span className="text-[10px] text-slate-400">{stage.shortDesc}</span>
                    </div>
                    <div className="flex-1 max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${stage.barColor} rounded-full`}
                        style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <div className="text-right font-mono tabular-nums w-20">
                      <span className="font-bold text-slate-900">{count}</span>
                      <span className="text-slate-400 ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent Pipeline Ownership Matrix */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Team Pipeline Ownership & Stage Load
              </h3>
              <p className="text-xs text-slate-500">
                Active leads, qualified meetings, and closed-won engagements per representative
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                    <th className="py-2.5 px-3">Representative</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">Active</th>
                    <th className="py-2.5 px-3 text-right">Meeting / Proposal</th>
                    <th className="py-2.5 px-3 text-right">Won</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers.map((u) => {
                    const uLeads = filteredLeads.filter((l) => l.assigned_to === u.id);
                    const uActive = uLeads.filter(
                      (l) => l.status !== 'Won' && l.status !== 'Lost'
                    ).length;
                    const uAdv = uLeads.filter(
                      (l) => l.status === 'Meeting' || l.status === 'Proposal Sent'
                    ).length;
                    const uWon = uLeads.filter((l) => l.status === 'Won').length;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900 block">
                            {u.display_name}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {u.role_name || u.role_id}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-800">
                          {uLeads.length}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-cyan-700 font-semibold">
                          {uActive}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-purple-700 font-semibold">
                          {uAdv}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 font-bold">
                          {uWon}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
            setStatusTransitionTarget({ lead: selectedLeadForDetail });
          }}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          currentUser={currentUser}
        />
      )}

      {statusTransitionTarget && (
        <StatusChangeModal
          isOpen={Boolean(statusTransitionTarget)}
          lead={statusTransitionTarget.lead}
          suggestedStatus={statusTransitionTarget.suggestedStatus}
          onClose={() => setStatusTransitionTarget(null)}
          onSubmit={handleStatusChangeSubmit}
        />
      )}

      {leadToDelete && (
        <ConfirmDialog
          isOpen={Boolean(leadToDelete)}
          title="Delete Lead Record"
          message={`Are you sure you want to permanently delete lead ${leadToDelete.lead_code} (${leadToDelete.company_name})?`}
          confirmLabel="Delete Lead"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setLeadToDelete(null)}
        />
      )}
    </div>
  );
};
