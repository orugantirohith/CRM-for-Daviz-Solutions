import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Lead, LeadStatus } from '../../types/crm';
import { StatusBadge } from '../../components/ui/StatusBadge';

interface StatusChangeModalProps {
  lead: Lead;
  suggestedStatus?: LeadStatus;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newStatus: LeadStatus, note: string) => void;
}

const ALL_STATUSES: LeadStatus[] = [
  'New',
  'Connected',
  'Qualified',
  'Meeting',
  'Proposal Sent',
  'Won',
  'Lost',
  'Follow-up Required',
];

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  lead,
  suggestedStatus,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(
    suggestedStatus || lead.status
  );
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setErrorMsg('Mandatory Rule: A non-empty progress note is required before saving a status change.');
      return;
    }
    if (selectedStatus === lead.status) {
      setErrorMsg('Please select a different status to proceed.');
      return;
    }

    onSubmit(selectedStatus, note.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Update Lead Status</h3>
            <p className="text-xs text-slate-400">
              {lead.lead_code} • {lead.company_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Current Status</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <span className="font-medium text-slate-700">Present stage:</span>
              <StatusBadge status={lead.status} />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">New Target Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as LeadStatus);
                setErrorMsg(null);
              }}
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 bg-white text-slate-900 font-medium"
            >
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st} {st === lead.status ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-700 font-semibold">
                Mandatory Status Change Note <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Enforced server-side & auditable</span>
            </div>
            <textarea
              required
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Detail the discussion, requirement, or decision justification that led to this stage transition..."
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900 leading-relaxed placeholder:text-slate-400"
            />
          </div>

          <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-xl text-[11px] text-cyan-900 space-y-1">
            <span className="font-semibold block">Audit Integrity Rule:</span>
            <p className="text-slate-600">
              Status changes are recorded atomically in the database history with your user identity
              and timestamp. Past notes cannot be overwritten.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Transition</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
