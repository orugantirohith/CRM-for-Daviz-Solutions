import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  MessageSquare,
  User,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { Plan, PlanStatus, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';

interface PlanListViewProps {
  currentUser: UserProfile;
}

export const PlanListView: React.FC<PlanListViewProps> = ({ currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanForReview, setSelectedPlanForReview] = useState<Plan | null>(null);
  const [managerComment, setManagerComment] = useState('');
  const [reviewDecision, setReviewDecision] = useState<'Approved' | 'Changes Requested'>('Approved');

  // Plan creation form
  const leads = crmService.getLeads();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [planDate, setPlanDate] = useState('2026-10-28');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [activityType, setActivityType] = useState<Plan['activity_type']>('Meeting');
  const [linkedLeadId, setLinkedLeadId] = useState(leads[0]?.id || '');
  const [location, setLocation] = useState('JAFZA South');
  const [priority, setPriority] = useState<Plan['priority']>('high');

  const plans = useMemo(() => {
    return crmService.getPlans();
  }, [isModalOpen, selectedPlanForReview, currentUser]);

  const canReview = currentUser.role_id === 'admin' || currentUser.role_id === 'sales_manager';

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const lead = leads.find((l) => l.id === linkedLeadId);

    crmService.createPlan({
      plan_date: planDate,
      owner_id: currentUser.id,
      created_by: currentUser.id,
      title: title.trim(),
      description: description.trim(),
      activity_type: activityType,
      start_at: `${planDate}T${startTime}:00Z`,
      end_at: `${planDate}T${endTime}:00Z`,
      lead_id: lead ? lead.id : undefined,
      company_id: lead ? lead.company_id : undefined,
      company_name: lead ? lead.company_name : undefined,
      location: location.trim(),
      priority,
      status: 'Submitted',
    });

    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForReview) return;

    crmService.approvePlan(selectedPlanForReview.id, managerComment.trim(), reviewDecision);
    setSelectedPlanForReview(null);
    setManagerComment('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Daily Sales Plans</h2>
          <p className="text-xs text-slate-500">
            Upcoming schedules, planned visits, scoping calls, and manager review workflow with instant notifications
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Daily Plan</span>
        </button>
      </div>

      {/* Plans List */}
      <div className="space-y-3">
        {plans.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200">
            No active plans found for this period.
          </div>
        ) : (
          plans.map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-cyan-400 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                    {p.plan_code}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{p.title}</span>
                  {p.company_name && (
                    <span className="text-xs text-cyan-700 font-medium bg-cyan-50 px-2 py-0.5 rounded">
                      {p.company_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} size="sm" />
                  {canReview && p.status === 'Submitted' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanForReview(p);
                        setManagerComment('');
                        setReviewDecision('Approved');
                      }}
                      className="px-2.5 py-1 bg-[#0B132B] hover:bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-xs transition-colors"
                    >
                      Review Plan
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Date: {p.plan_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Time: {formatDubaiDateTime(p.start_at, true)} - {formatDubaiDateTime(p.end_at, true)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Owner: {p.owner_name || 'Agent'}</span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{p.description}</p>

              {p.manager_comment && (
                <div className="p-3 bg-cyan-50/80 border border-cyan-100 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-cyan-950 block text-[11px]">
                    Manager Review Feedback:
                  </span>
                  <p className="text-slate-700 italic">"{p.manager_comment}"</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Plan Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold">New Daily Sales Plan</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Plan Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scoping Meeting & Architecture Demo with Al-Futtaim"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Plan Date</label>
                  <input
                    type="date"
                    required
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Activity Type</label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                  >
                    <option value="Visit">Physical Visit</option>
                    <option value="Meeting">Scoping Meeting</option>
                    <option value="Call">Client Discovery Call</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Prospecting">Prospecting</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <label className="block text-slate-700 font-semibold mb-1">Linked Account</label>
                <select
                  value={linkedLeadId}
                  onChange={(e) => setLinkedLeadId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500"
                >
                  <option value="">None (Independent General Task)</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.company_name} ({l.lead_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Planned Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Client Office / Online Teams"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Plan Description & Objectives</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is the objective of this visit or activity? What deliverables will be achieved?"
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
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal for Manager */}
      {selectedPlanForReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold">Review Plan: {selectedPlanForReview.plan_code}</h3>
              <button
                type="button"
                onClick={() => setSelectedPlanForReview(null)}
                className="text-slate-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Agent</span>
                <p className="font-bold text-slate-900">{selectedPlanForReview.owner_name}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Title</span>
                <p className="font-medium text-slate-800">{selectedPlanForReview.title}</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Decision</label>
                <select
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="Approved">Approve Plan</option>
                  <option value="Changes Requested">Request Changes</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Manager Review Feedback *
                </label>
                <textarea
                  required
                  rows={3}
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  placeholder="Provide guidance, required milestones, or approval notes..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForReview(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold"
                >
                  Save Decision & Notify Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
