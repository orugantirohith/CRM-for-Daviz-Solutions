import React, { useState, useMemo } from 'react';
import { Clock, Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { FollowUp, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';
import { filterRecordsByScope } from '../../lib/permissions/permissionCheck';

interface FollowUpListViewProps {
  currentUser: UserProfile;
}

export const FollowUpListView: React.FC<FollowUpListViewProps> = ({ currentUser }) => {
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [completingFollowUp, setCompletingFollowUp] = useState<FollowUp | null>(null);
  const [outcomeNote, setOutcomeNote] = useState('');

  const leads = useMemo(
    () => filterRecordsByScope(crmService.getLeads(), currentUser, 'leads'),
    [refreshKey, isModalOpen, currentUser]
  );
  const [linkedLeadId, setLinkedLeadId] = useState(leads[0]?.id || 'manual');
  const [manualCompanyName, setManualCompanyName] = useState('');
  const [manualContactName, setManualContactName] = useState('');
  const [channel, setChannel] = useState<FollowUp['channel']>('Call');
  const [dueDate, setDueDate] = useState('2026-10-29T10:00:00Z');
  const [objective, setObjective] = useState('');
  const [priority, setPriority] = useState<FollowUp['priority']>('high');

  const followUps = useMemo(() => {
    let result = filterRecordsByScope(crmService.getFollowUps(), currentUser, 'follow_ups');
    if (statusFilter !== 'all') {
      result = result.filter((f) => f.status === statusFilter);
    }
    return result;
  }, [statusFilter, completingFollowUp, isModalOpen, refreshKey, currentUser]);

  const handleOpenCreate = () => {
    const currentLeads = filterRecordsByScope(crmService.getLeads(), currentUser, 'leads');
    setLinkedLeadId(currentLeads[0]?.id || 'manual');
    setManualCompanyName('');
    setManualContactName('');
    setObjective('');
    setIsModalOpen(true);
  };

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) return;

    const lead = leads.find((l) => l.id === linkedLeadId);
    const isManual = linkedLeadId === 'manual' || !lead;
    const companyName = isManual ? manualCompanyName.trim() : lead.company_name;
    const contactName = isManual ? manualContactName.trim() || 'Primary Contact' : lead.contact_name;

    if (!companyName) return;

    crmService.createFollowUp({
      lead_id: isManual ? '' : lead.id,
      company_id: isManual ? '' : lead.company_id,
      company_name: companyName,
      contact_name: contactName,
      assigned_to: currentUser.id,
      assigned_user_name: currentUser.display_name,
      due_at: dueDate,
      channel,
      objective: objective.trim(),
      status: 'Pending',
      priority,
      created_by: currentUser.id,
    });

    setRefreshKey((k) => k + 1);
    setIsModalOpen(false);
    setObjective('');
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingFollowUp || !outcomeNote.trim()) return;

    crmService.completeFollowUp(completingFollowUp.id, outcomeNote.trim());
    setCompletingFollowUp(null);
    setOutcomeNote('');
    setRefreshKey((k) => k + 1);
  };

  const handleDeleteFollowUp = (id: string) => {
    crmService.deleteFollowUp(id);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Client Follow-ups</h2>
          <p className="text-xs text-slate-500">
            Actionable touchpoints, outreach reminders, and mandatory resolution notes
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Follow-up</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-medium">
        {['Pending', 'Completed', 'all'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`py-2 px-4 border-b-2 capitalize transition-colors ${
              statusFilter === st
                ? 'border-cyan-600 text-cyan-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {st === 'all' ? 'All Follow-ups' : st}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {followUps.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200 text-xs">
            No follow-ups in this view.
          </div>
        ) : (
          followUps.map((f) => (
            <div
              key={f.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-cyan-400 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                    {f.follow_up_code}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{f.company_name}</span>
                  <span className="text-slate-500 font-medium">({f.contact_name})</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                    {f.channel}
                  </span>
                </div>
                <p className="text-slate-700">{f.objective}</p>
                <div className="text-[10px] text-slate-400 flex items-center gap-3">
                  <span>Due: {formatDubaiDateTime(f.due_at)}</span>
                  <span>Agent: {f.assigned_user_name || 'Agent'}</span>
                  <span className="capitalize">Priority: {f.priority}</span>
                </div>
                {f.outcome_note && (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 italic">
                    Outcome: "{f.outcome_note}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {f.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompletingFollowUp(f);
                      setOutcomeNote('');
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Done</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteFollowUp(f.id)}
                  title="Delete Follow-up"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold">New Follow-up</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Account *</label>
                <select
                  value={linkedLeadId}
                  onChange={(e) => setLinkedLeadId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 font-medium"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name} ({l.contact_name})
                    </option>
                  ))}
                  <option value="manual">+ Enter Company & Contact Manually</option>
                </select>
              </div>

              {(linkedLeadId === 'manual' || leads.length === 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={manualCompanyName}
                      onChange={(e) => setManualCompanyName(e.target.value)}
                      placeholder="e.g. Dubai Holding"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={manualContactName}
                      onChange={(e) => setManualContactName(e.target.value)}
                      placeholder="e.g. Khalid Al-Nuaimi"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Visit">On-site Visit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Due Date & Time (Dubai)</label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate.slice(0, 16)}
                  onChange={(e) => setDueDate(new Date(e.target.value).toISOString())}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Objective / DTLs *</label>
                <textarea
                  required
                  rows={3}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="e.g. Call decision-maker to confirm technical scope and next steps..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold"
                >
                  Save Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completingFollowUp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Complete Follow-up</h3>
              <button
                type="button"
                onClick={() => setCompletingFollowUp(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <p className="font-semibold text-slate-800">
                  {completingFollowUp.company_name} ({completingFollowUp.contact_name})
                </p>
                <p className="text-slate-600 mt-0.5">{completingFollowUp.objective}</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Resolution / Outcome Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={outcomeNote}
                  onChange={(e) => setOutcomeNote(e.target.value)}
                  placeholder="Record what was discussed and the client's direct response..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletingFollowUp(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Confirm Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
