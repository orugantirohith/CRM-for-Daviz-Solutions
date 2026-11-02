import React, { useState, useMemo } from 'react';
import { History, Search, Filter, ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { ActivityLog, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';

interface ActivityLogsViewProps {
  currentUser: UserProfile;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  const logs = useMemo(() => {
    let result = crmService.getActivityLogs();
    if (actionFilter !== 'all') {
      result = result.filter((l) => l.action === actionFilter);
    }
    if (moduleFilter !== 'all') {
      result = result.filter((l) => l.module === moduleFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.actor_name.toLowerCase().includes(q) ||
          (l.record_id && l.record_id.toLowerCase().includes(q))
      );
    }
    return result;
  }, [actionFilter, moduleFilter, searchQuery, currentUser]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">System Activity Logs</h2>
          <p className="text-xs text-slate-500">
            Immutable security audit trail — tracking record mutations, stage changes, exports, and permission updates
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 min-w-[240px] max-w-sm relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search audit descriptions, records, actors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium text-[11px]">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
            >
              <option value="all">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              <option value="DELETE">DELETE</option>
              <option value="PERMISSION_CHANGE">PERMISSION_CHANGE</option>
              <option value="EXPORT">EXPORT</option>
              <option value="ARCHIVE">ARCHIVE</option>
              <option value="RESTORE">RESTORE</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium text-[11px]">Module:</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
            >
              <option value="all">All Modules</option>
              <option value="leads">Leads</option>
              <option value="companies">Companies</option>
              <option value="visits">Visits</option>
              <option value="plans">Plans</option>
              <option value="roles_permissions">Roles & Permissions</option>
              <option value="user_management">User Management</option>
              <option value="archive">Archive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Timestamp (Dubai)</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Module</th>
              <th className="py-3 px-4">Record ID</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                  {formatDubaiDateTime(log.timestamp, true)}
                </td>
                <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                  {log.actor_name}
                  <span className="text-[10px] text-slate-400 block font-normal capitalize">
                    {log.actor_role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 font-medium text-slate-700 uppercase text-[10px] tracking-wide">
                  {log.module}
                </td>
                <td className="py-3 px-4 font-mono font-bold text-cyan-700">
                  {log.record_id || '—'}
                </td>
                <td className="py-3 px-4 text-slate-700 max-w-md">{log.description}</td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Success
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
