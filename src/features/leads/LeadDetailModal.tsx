import React, { useState } from 'react';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Plus,
  MessageSquare,
  History,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Lead, LeadNote, LeadStatusHistory, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { formatDubaiDateTime, formatWhatsAppLink } from '../../lib/dates/dubaiDate';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface LeadDetailModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onOpenStatusModal: () => void;
  onRefresh: () => void;
  currentUser: UserProfile;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  isOpen,
  onClose,
  onOpenStatusModal,
  onRefresh,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'history'>('overview');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  if (!isOpen) return null;

  const notes: LeadNote[] = crmService.getLeadNotes(lead.id);
  const history: LeadStatusHistory[] = crmService.getLeadStatusHistory(lead.id);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsSubmittingNote(true);
    crmService.addLeadNote(lead.id, newNoteText.trim());
    setNewNoteText('');
    setIsSubmittingNote(false);
    onRefresh();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 bg-[#0B132B] text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-cyan-400 font-bold text-xs bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                {lead.lead_code}
              </span>
              <StatusBadge status={lead.status} />
              <span className="text-xs text-slate-400 capitalize">• Priority: {lead.priority}</span>
            </div>
            <h2 className="text-lg font-bold text-white">{lead.company_name}</h2>
            <p className="text-xs text-slate-300">
              Contact: <span className="font-semibold text-white">{lead.contact_name}</span> (
              {lead.job_title || 'Decision Maker'})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'overview'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Overview & DTLs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'notes'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Activity Notes ({notes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'history'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Status History ({history.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenStatusModal}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Change Stage / Status</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {activeTab === 'overview' && (
            <div className="space-y-6">
                  {/* Industry, Assignment, Deal Value & Follow-up Highlight */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Industry & Sector
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                        {lead.industry || 'Enterprise'}
                      </span>
                      <span className="text-[10px] text-cyan-600 font-medium capitalize">
                        Priority: {lead.priority}
                      </span>
                    </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Assigned Sales Agent
                        </span>
                          <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                            {lead.assigned_user_name || 'Assigned Agent'}
                          </span>
                          <span className="text-[10px] text-slate-500">Source: {lead.lead_source}</span>
                      </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Deal Value & Area
                          </span>
                          <span className="text-sm font-bold text-emerald-700 mt-1 block truncate font-mono">
                            AED {Number(lead.estimated_value || 0).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Area: {lead.area || lead.city || 'Dubai'}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Next Follow-up
                          </span>
                            <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                              {lead.next_follow_up_at
                                ? formatDubaiDateTime(lead.next_follow_up_at, false)
                                : 'None scheduled'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Last: {formatDubaiDateTime(lead.last_contacted_at, false)}
                            </span>
                        </div>
                      </div>

                      {/* Lead Details / Requirements (DTLs) */}
                      <div className="p-4 bg-cyan-50/40 border border-cyan-200/80 rounded-xl space-y-1.5">
                        <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-cyan-600" />
                          Lead Details & Requirements (DTLs)
                        </h4>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                          {lead.details?.trim()
                            ? lead.details
                            : 'No specific project DTLs recorded yet. Click Edit on this lead to add client requirements and scope details.'}
                        </p>
                      </div>

                      {/* Multiple Contact Channels */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Phone Numbers */}
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                          <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-cyan-600" />
                            Phone Numbers & WhatsApp
                          </h4>
                          <div className="divide-y divide-slate-100">
                            {lead.phones.map((p) => (
                              <div
                                key={p.id}
                                className="py-2 flex items-center justify-between gap-2 first:pt-1"
                              >
                                <div>
                                  <span className="font-mono font-semibold text-slate-800 block">
                                    {p.phone_number}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{p.label || 'Contact'}</span>
                                </div>
                                <a
                                  href={formatWhatsAppLink(p.phone_number)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold transition-colors"
                                >
                                  WhatsApp
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Email Addresses */}
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                          <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-cyan-600" />
                            Email Addresses
                          </h4>
                          <div className="divide-y divide-slate-100">
                            {lead.emails.map((e) => (
                              <div
                                key={e.id}
                                className="py-2 flex items-center justify-between gap-2 first:pt-1"
                              >
                                <div className="min-w-0">
                                  <span className="font-medium text-slate-800 block truncate">
                                    {e.email}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{e.label || 'Work'}</span>
                                </div>
                                <a
                                  href={`mailto:${e.email}`}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold transition-colors shrink-0"
                                >
                                  Email
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Location & Social */}
                      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                        <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                          UAE Location & Online Presence
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Emirate, City & Area:</span>
                            <span className="font-medium text-slate-800">
                              {lead.city}, {lead.emirate_state}, {lead.country}
                            </span>
                            {lead.area && (
                              <span className="text-[11px] text-cyan-700 font-semibold block mt-0.5">
                                Area / Free Zone: {lead.area}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 block mt-0.5">{lead.address}</span>
                          </div>
                          <div className="space-y-1">
                            {lead.website && (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-600 hover:underline flex items-center gap-1 truncate"
                              >
                                <span>Website: {lead.website}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {lead.linkedin_url && (
                              <a
                                href={lead.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 truncate"
                              >
                                <span>LinkedIn Profile</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
          )}

                    {activeTab === 'notes' && (
                      <div className="space-y-5">
                        {/* Add Note Form */}
                        <form
                          onSubmit={handleAddNote}
                          className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
                        >
                          <label className="block text-slate-700 font-semibold">
                            Add Activity Note / Call Log
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            placeholder="Record summary of call, meeting highlights, client requirements, or commercial feedback..."
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 bg-white"
                          />
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={isSubmittingNote}
                              className="px-4 py-1.5 bg-[#0B132B] hover:bg-slate-900 text-white rounded-lg font-semibold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Save Note</span>
                            </button>
                          </div>
                        </form>

                        {/* Notes Timeline */}
                        <div className="space-y-3">
                          {notes.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                              No notes recorded yet for this lead.
                            </div>
                          ) : (
                            notes.map((n) => (
                              <div
                                key={n.id}
                                className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                  <span className="font-semibold text-slate-800">
                                    {n.author_name} ({n.author_role || 'Agent'})
                                  </span>
                                  <span>{formatDubaiDateTime(n.created_at)}</span>
                                </div>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                  {n.note_text}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'history' && (
                      <div className="space-y-4">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                          <strong>Mandatory Note Audit Trail:</strong> Every transition requires an explicit
                          justification note and is saved atomically to prevent unrecorded pipeline changes.
                        </div>

                        <div className="space-y-3">
                          {history.map((h) => (
                            <div
                              key={h.id}
                              className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={h.previous_status} size="sm" />
                                  <span className="text-slate-400 font-bold">→</span>
                                  <StatusBadge status={h.new_status} size="sm" />
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {formatDubaiDateTime(h.changed_at)}
                                </span>
                              </div>

                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-800 italic">
                                "{h.note}"
                              </div>

                              <div className="text-[10px] text-slate-500">
                                Changed by: <span className="font-medium text-slate-700">{h.changed_by_name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
};
