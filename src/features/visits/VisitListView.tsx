import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  User,
  Trash2,
  X,
} from 'lucide-react';
import { UserProfile, Visit, VisitOutcome, VisitStatus } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';
import { filterRecordsByScope } from '../../lib/permissions/permissionCheck';

interface VisitListViewProps {
  currentUser: UserProfile;
}

export const VisitListView: React.FC<VisitListViewProps> = ({ currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisitForDetail, setSelectedVisitForDetail] = useState<Visit | null>(null);
  const [visitToDelete, setVisitToDelete] = useState<Visit | null>(null);

  const leads = useMemo(
    () => filterRecordsByScope(crmService.getLeads(), currentUser, 'leads'),
    [refreshKey, isModalOpen, currentUser]
  );

  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || 'manual');
  const [manualCompanyName, setManualCompanyName] = useState<string>('');
  const [manualContactName, setManualContactName] = useState<string>('');
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('11:30');
  const [location, setLocation] = useState<string>('Client HQ, Dubai');
  const [status, setStatus] = useState<VisitStatus>('Completed');
  const [outcome, setOutcome] = useState<VisitOutcome>('Positive');
  const [discussionSummary, setDiscussionSummary] = useState<string>('');
  const [clientRequirements, setClientRequirements] = useState<string>('');
  const [decisionMakerPresent, setDecisionMakerPresent] = useState<boolean>(true);
  const [nextSteps, setNextSteps] = useState<string>('');
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(true);
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('2026-10-31T10:00:00Z');

  const activeLead = leads.find((l) => l.id === selectedLeadId);

  const visits = useMemo(() => {
    let result = filterRecordsByScope(crmService.getVisits(), currentUser, 'visits');
    if (statusFilter !== 'all') {
      result = result.filter((v) => v.status === statusFilter);
    }
    if (outcomeFilter !== 'all') {
      result = result.filter((v) => v.outcome === outcomeFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.visit_code.toLowerCase().includes(q) ||
          v.company_name.toLowerCase().includes(q) ||
          v.contact_name.toLowerCase().includes(q) ||
          v.location.toLowerCase().includes(q) ||
          v.discussion_summary.toLowerCase().includes(q)
      );
    }
    return result;
  }, [statusFilter, outcomeFilter, searchQuery, isModalOpen, refreshKey, currentUser]);

  const allVisits = useMemo(
    () => filterRecordsByScope(crmService.getVisits(), currentUser, 'visits'),
    [refreshKey, isModalOpen, currentUser]
  );
  const kpiTotal = allVisits.length;
  const kpiCompleted = allVisits.filter((v) => v.status === 'Completed').length;
  const kpiPositive = allVisits.filter((v) => v.outcome === 'Positive').length;
  const kpiFollowUp = allVisits.filter((v) => v.follow_up_required).length;

  const handleOpenCreateModal = () => {
    const currentLeads = filterRecordsByScope(crmService.getLeads(), currentUser, 'leads');
    if (currentLeads.length > 0) {
      setSelectedLeadId(currentLeads[0].id);
      setLocation(`${currentLeads[0].city}, ${currentLeads[0].emirate_state}`);
    } else {
      setSelectedLeadId('manual');
      setLocation('Dubai, UAE');
    }
    setManualCompanyName('');
    setManualContactName('');
    setDiscussionSummary('');
    setClientRequirements('');
    setNextSteps('');
    setIsModalOpen(true);
  };

  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionSummary.trim()) return;

    const isManual = selectedLeadId === 'manual' || !activeLead;
    const companyName = isManual ? manualCompanyName.trim() : activeLead.company_name;
    const contactName = isManual ? manualContactName.trim() || 'Primary Contact' : activeLead.contact_name;

    if (!companyName) return;

    crmService.createVisit({
      lead_id: isManual ? '' : activeLead.id,
      lead_code: isManual ? undefined : activeLead.lead_code,
      company_id: isManual ? '' : activeLead.company_id,
      company_name: companyName,
      contact_name: contactName,
      visit_date: visitDate,
      start_at: `${visitDate}T${startTime}:00Z`,
      end_at: `${visitDate}T${endTime}:00Z`,
      assigned_to: currentUser.id,
      assigned_user_name: currentUser.display_name,
      location: location.trim() || 'Dubai, UAE',
      status,
      outcome,
      discussion_summary: discussionSummary.trim(),
      client_requirements: clientRequirements.trim(),
      decision_maker_present: decisionMakerPresent,
      next_steps: nextSteps.trim(),
      follow_up_required: followUpRequired,
      next_follow_up_at: followUpRequired ? nextFollowUpDate : null,
      created_by: currentUser.id,
    });

    setRefreshKey((k) => k + 1);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!visitToDelete) return;
    crmService.deleteVisit(visitToDelete.id);
    if (selectedVisitForDetail?.id === visitToDelete.id) {
      setSelectedVisitForDetail(null);
    }
    setVisitToDelete(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Client Physical Visits</h2>
          <p className="text-xs text-slate-500">
            Physical on-site consultation reports across Dubai & Abu Dhabi, separated by status and business outcome
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Log Client Visit</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Visits Logged
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{kpiTotal}</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Completed Visits
          </span>
          <span className="text-2xl font-bold text-blue-600 mt-1 block">{kpiCompleted}</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Positive Outcomes
          </span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">{kpiPositive}</span>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Follow-up Required
          </span>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">{kpiFollowUp}</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 min-w-[220px] max-w-sm relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search visits by code, company, contact, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium text-[11px]">Appointment:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Planned">Planned</option>
              <option value="Completed">Completed</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium text-[11px]">Outcome:</span>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
            >
              <option value="all">All Outcomes</option>
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Needs Follow-up">Needs Follow-up</option>
              <option value="Opportunity Identified">Opportunity Identified</option>
              <option value="Negative">Negative</option>
            </select>
          </div>
        </div>
      </div>

      {/* Visits List */}
      <div className="space-y-3">
        {visits.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200 text-xs">
            No client visits logged yet. Click "Log Client Visit" to record an on-site session.
          </div>
        ) : (
          visits.map((v) => (
            <div
              key={v.id}
              onClick={() => setSelectedVisitForDetail(v)}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-cyan-400 transition-all cursor-pointer space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                    {v.visit_code}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{v.company_name}</span>
                  <span className="text-xs text-slate-500">
                    (Contact: <span className="font-medium text-slate-700">{v.contact_name}</span>)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={v.status} size="sm" />
                  {v.outcome && <StatusBadge status={v.outcome} size="sm" />}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisitToDelete(v);
                    }}
                    title="Delete Visit"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Date: {v.visit_date} ({formatDubaiDateTime(v.start_at, true)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{v.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Agent: {v.assigned_user_name || 'Agent'}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700">
                <span className="font-semibold text-slate-800 block text-[11px] mb-1">
                  Discussion Summary:
                </span>
                <p className="line-clamp-2 leading-relaxed">{v.discussion_summary}</p>
              </div>

              {v.next_steps && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    Next Steps: <strong className="text-slate-700">{v.next_steps}</strong>
                  </span>
                  {v.follow_up_required && (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Follow-up scheduled
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Visit Detail Modal */}
      {selectedVisitForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-cyan-400 font-bold block">
                  {selectedVisitForDetail.visit_code}
                </span>
                <h3 className="text-sm font-bold">{selectedVisitForDetail.company_name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVisitForDetail(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Contact Person
                  </span>
                  <span className="font-bold text-slate-900">{selectedVisitForDetail.contact_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedVisitForDetail.status} size="sm" />
                  {selectedVisitForDetail.outcome && (
                    <StatusBadge status={selectedVisitForDetail.outcome} size="sm" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Visit Date & Time
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedVisitForDetail.visit_date} ({formatDubaiDateTime(selectedVisitForDetail.start_at, true)})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Location
                  </span>
                  <span className="font-semibold text-slate-800">{selectedVisitForDetail.location}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Discussion Summary
                </span>
                <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-line leading-relaxed">
                  {selectedVisitForDetail.discussion_summary}
                </p>
              </div>

              {selectedVisitForDetail.client_requirements && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Client DTLs / Requirements
                  </span>
                  <p className="p-3 bg-cyan-50/40 rounded-lg border border-cyan-100">
                    {selectedVisitForDetail.client_requirements}
                  </p>
                </div>
              )}

              {selectedVisitForDetail.next_steps && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Next Steps
                  </span>
                  <p className="font-medium text-slate-800">{selectedVisitForDetail.next_steps}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedVisitForDetail(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Visit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold">Log Physical Client Visit</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Linked Lead Selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Linked Lead / Account *
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => {
                    setSelectedLeadId(e.target.value);
                    const sel = leads.find((l) => l.id === e.target.value);
                    if (sel) {
                      setLocation(`${sel.city}, ${sel.emirate_state}`);
                    }
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 text-slate-900 font-medium"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name} ({l.lead_code} • {l.contact_name})
                    </option>
                  ))}
                  <option value="manual">+ Enter Company & Contact Manually</option>
                </select>
              </div>

              {(selectedLeadId === 'manual' || leads.length === 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={manualCompanyName}
                      onChange={(e) => setManualCompanyName(e.target.value)}
                      placeholder="e.g. Emirates Logistics LLC"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={manualContactName}
                      onChange={(e) => setManualContactName(e.target.value)}
                      placeholder="e.g. Tariq Al-Mansoor"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Visit Date</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Time (Dubai)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Time (Dubai)</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Physical Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. JAFZA South Gate 4, Boardroom B"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              {/* Status vs Outcome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Appointment Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as VisitStatus)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Planned">Planned</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="No Show">No Show</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Business Outcome</label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as VisitOutcome)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="Positive">Positive</option>
                    <option value="Needs Follow-up">Needs Follow-up</option>
                    <option value="Opportunity Identified">Opportunity Identified</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Negative">Negative</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Discussion Summary <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={discussionSummary}
                  onChange={(e) => setDiscussionSummary(e.target.value)}
                  placeholder="Key agenda points, client analytics pain points, questions asked..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Client Technical / Project DTLs
                </label>
                <input
                  type="text"
                  value={clientRequirements}
                  onChange={(e) => setClientRequirements(e.target.value)}
                  placeholder="e.g. Telemetry ingestion, Power BI Premium, automated DAX calculations"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-4 py-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decisionMakerPresent}
                    onChange={(e) => setDecisionMakerPresent(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="font-medium text-slate-700">Decision Maker was present</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUpRequired}
                    onChange={(e) => setFollowUpRequired(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="font-medium text-slate-700">Follow-up is required</span>
                </label>
              </div>

              {followUpRequired && (
                <div className="p-3 bg-cyan-50/60 border border-cyan-100 rounded-xl space-y-2">
                  <label className="block text-cyan-950 font-semibold">Next Follow-up Date & Time</label>
                  <input
                    type="datetime-local"
                    value={nextFollowUpDate.slice(0, 16)}
                    onChange={(e) => setNextFollowUpDate(new Date(e.target.value).toISOString())}
                    className="w-full p-2 border border-cyan-200 rounded-lg bg-white outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Next Steps</label>
                <input
                  type="text"
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                  placeholder="e.g. Submit technical scope document by Thursday 2 PM"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Visit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {visitToDelete && (
        <ConfirmDialog
          isOpen={Boolean(visitToDelete)}
          title="Delete Client Visit"
          message={`Are you sure you want to delete visit ${visitToDelete.visit_code} (${visitToDelete.company_name})?`}
          confirmLabel="Delete Visit"
          isDestructive={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => setVisitToDelete(null)}
        />
      )}
    </div>
  );
};
