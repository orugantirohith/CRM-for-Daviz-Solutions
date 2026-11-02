import React from 'react';
import { LeadStatus, VisitOutcome, VisitStatus } from '../../types/crm';

interface StatusBadgeProps {
  status: LeadStatus | VisitStatus | VisitOutcome | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = (val: string) => {
    switch (val) {
      case 'New':
      case 'Planned':
      case 'To Do':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Connected':
      case 'In Progress':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Qualified':
      case 'Submitted':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Meeting':
      case 'Scheduled':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Proposal Sent':
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Won':
      case 'Completed':
      case 'Approved':
      case 'Positive':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Lost':
      case 'Cancelled':
      case 'No Show':
      case 'Negative':
      case 'Blocked':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Changes Requested':
      case 'Rescheduled':
      case 'Needs Follow-up':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${pad} ${getBadgeStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
};
