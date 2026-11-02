import React, { useMemo } from 'react';
import {
  Users,
  Clock,
  MapPin,
  TrendingUp,
  Award,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Activity,
  Building2,
  ChevronRight,
  Kanban,
} from 'lucide-react';
import { LeadStatus, ModuleKey, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { filterRecordsByScope } from '../../lib/permissions/permissionCheck';

interface DashboardViewProps {
  currentUser: UserProfile;
  selectedDateRange: string;
  onNavigateToModule: (module: ModuleKey) => void;
  onSelectLead?: (leadId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  selectedDateRange,
  onNavigateToModule,
  onSelectLead,
}) => {
  const leads = useMemo(() => {
    const raw = crmService.getLeads();
    return filterRecordsByScope(raw, currentUser, 'leads');
  }, [currentUser]);

  const visits = useMemo(() => {
    const raw = crmService.getVisits();
    return filterRecordsByScope(raw, currentUser, 'visits');
  }, [currentUser]);

  const followUps = useMemo(() => {
    const raw = crmService.getFollowUps();
    return filterRecordsByScope(raw, currentUser, 'follow_ups');
  }, [currentUser]);

  const activityLogs = useMemo(() => {
    const raw = crmService.getActivityLogs();
    if (currentUser.role_id === 'admin') return raw;
    return raw.filter((a) => a.actor_id === currentUser.id);
  }, [currentUser]);

  const allUsers = useMemo(() => crmService.getUsers(), []);

  // Compute live KPIs
  const totalLeads = leads.length;
  const pendingFollowUps = followUps.filter((f) => f.status === 'Pending').length;
  const todayVisits = visits.length;
  const wonLeads = leads.filter((l) => l.status === 'Won').length;
  const proposalLeads = leads.filter((l) => l.status === 'Proposal Sent').length;
  const qualifiedLeads = leads.filter((l) => l.status === 'Qualified').length;
  const meetingLeads = leads.filter((l) => l.status === 'Meeting').length;
  const connectedLeads = leads.filter((l) => l.status === 'Connected').length;
  const newLeads = leads.filter((l) => l.status === 'New').length;

  const totalCompanies = useMemo(() => crmService.getCompanies().length, [currentUser, leads]);
  const conversionRate = totalLeads > 0 ? Math.round(((wonLeads + proposalLeads) / totalLeads) * 100) : 0;

  // Funnel steps
  const funnelSteps = [
    { label: 'New', count: newLeads, color: 'bg-blue-500' },
    { label: 'Connected', count: connectedLeads, color: 'bg-cyan-500' },
    { label: 'Qualified', count: qualifiedLeads, color: 'bg-indigo-500' },
    { label: 'Meeting', count: meetingLeads, color: 'bg-purple-500' },
    { label: 'Proposal', count: proposalLeads, color: 'bg-amber-500' },
    { label: 'Won', count: wonLeads, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              UAE Executive Dashboard
            </span>
            <span className="text-xs text-slate-400">• Range: {selectedDateRange}</span>
          </div>
          <h1 className="text-xl font-bold mt-1 tracking-tight">
            Welcome back, {currentUser.display_name}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            DAVIZ Solutions Sales Command Centre — tracking BI & analytics opportunities, physical
            on-site client visits across Dubai & Abu Dhabi, and daily pipeline conversions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateToModule('pipeline')}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Sales Pipeline</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToModule('leads')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <span>+ New Lead</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateToModule('visits')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Log Visit</span>
          </button>
        </div>
      </div>

      {/* Top KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1 */}
        <div
          onClick={() => onNavigateToModule('leads')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-cyan-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Leads
            </span>
            <Users className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalLeads}</div>
          <div className="mt-1 flex items-center text-[10px] text-emerald-600 font-medium">
            <span>Active in pipeline</span>
          </div>
        </div>

        {/* Card 2 */}
        <div
          onClick={() => onNavigateToModule('follow_ups')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Follow-ups Due
            </span>
            <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{pendingFollowUps}</div>
          <div className="mt-1 flex items-center text-[10px] text-amber-600 font-medium">
            <span>Action required</span>
          </div>
        </div>

        {/* Card 3 */}
        <div
          onClick={() => onNavigateToModule('visits')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Client Visits
            </span>
            <MapPin className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{todayVisits}</div>
          <div className="mt-1 flex items-center text-[10px] text-blue-600 font-medium">
            <span>On-site client sessions</span>
          </div>
        </div>

        {/* Card 4 */}
        <div
          onClick={() => onNavigateToModule('leads')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Conversion
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{conversionRate}%</div>
          <div className="mt-1 flex items-center text-[10px] text-emerald-600 font-medium">
            <span>Qualified to Proposal/Won</span>
          </div>
        </div>

        {/* Card 5 */}
        <div
          onClick={() => onNavigateToModule('leads')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Meetings
            </span>
            <Calendar className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{meetingLeads}</div>
          <div className="mt-1 flex items-center text-[10px] text-purple-600 font-medium">
            <span>Scoping workshops</span>
          </div>
        </div>

        {/* Card 6: Companies */}
        <div
          onClick={() => onNavigateToModule('companies')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-cyan-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Companies
            </span>
            <Building2 className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalCompanies}</div>
          <div className="mt-1 flex items-center text-[10px] text-cyan-600 font-medium">
            <span>Corporate accounts</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Conversion Funnel & Pipeline Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Conversion Funnel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lead Conversion Funnel</h3>
              <p className="text-xs text-slate-400">
                Progression from inbound discovery to contract award
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToModule('pipeline')}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              <span>Open Pipeline Board</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {funnelSteps.map((step) => {
              const pct = totalLeads > 0 ? Math.round((step.count / totalLeads) * 100) : 0;
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${step.color}`} />
                      {step.label}
                    </span>
                    <span className="font-mono text-slate-500">
                      {step.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${step.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Lead Status Highlights */}
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
              <span className="text-[10px] font-semibold text-blue-600 uppercase">New Leads</span>
              <p className="text-lg font-bold text-blue-900 mt-0.5">{newLeads}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-100">
              <span className="text-[10px] font-semibold text-purple-600 uppercase">Meetings</span>
              <p className="text-lg font-bold text-purple-900 mt-0.5">{meetingLeads}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase">Won / Active</span>
              <p className="text-lg font-bold text-emerald-900 mt-0.5">{wonLeads + proposalLeads}</p>
            </div>
          </div>
        </div>

        {/* Team Performance for Admin/Manager OR Personal Milestones for Agent */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          {currentUser.role_id === 'admin' || currentUser.role_id === 'sales_manager' ? (
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Team Activity</h3>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>

              <div className="mt-4 space-y-3">
                {allUsers.map((u) => {
                  const userLeads = leads.filter((l) => l.assigned_to === u.id).length;
                  const userVisits = visits.filter((v) => v.assigned_to === u.id || v.created_by === u.id).length;
                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 block">{u.display_name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {u.role_name || u.role_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Leads</span>
                          <span className="font-bold text-slate-800">{userLeads}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Visits</span>
                          <span className="font-bold text-cyan-600">{userVisits}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">My Sales Execution</h3>
                  <p className="text-[11px] text-slate-400">Personal assigned targets & pipeline</p>
                </div>
                <Activity className="w-4 h-4 text-cyan-600" />
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Assigned Leads</span>
                    <span className="text-[10px] text-slate-500">Active pipeline accounts</span>
                  </div>
                  <span className="text-lg font-bold text-cyan-800 font-mono">{totalLeads}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Won / In-Progress</span>
                    <span className="text-[10px] text-slate-500">Proposal & Won contracts</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-800 font-mono">{wonLeads + proposalLeads}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Client Visits Logged</span>
                    <span className="text-[10px] text-slate-500">Physical field meetings</span>
                  </div>
                  <span className="text-lg font-bold text-amber-800 font-mono">{todayVisits}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            {currentUser.role_id === 'admin' || currentUser.role_id === 'sales_manager' ? (
              <button
                type="button"
                onClick={() => onNavigateToModule('activity_logs')}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Audit Trail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateToModule('pipeline')}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View My Pipeline Deals</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Upcoming Client Visits & Urgent Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today & Upcoming Visits */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent & Upcoming Client Visits</h3>
              <p className="text-xs text-slate-400">On-site client sessions in Dubai & Abu Dhabi</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToModule('visits')}
              className="text-xs text-cyan-600 hover:underline font-medium"
            >
              View All
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {visits.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                <MapPin className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p>No client visits logged yet.</p>
                <button
                  type="button"
                  onClick={() => onNavigateToModule('visits')}
                  className="mt-1 text-cyan-600 font-semibold hover:underline inline-block"
                >
                  + Log your first on-site visit
                </button>
              </div>
            ) : (
              visits.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-xs space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{v.company_name}</span>
                    <StatusBadge status={v.outcome || v.status} size="sm" />
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{v.location}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 italic line-clamp-1">
                    "{v.discussion_summary}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Due Follow-ups */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pending Follow-up Reminders</h3>
              <p className="text-xs text-slate-400">Next touchpoints with decision-makers</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToModule('follow_ups')}
              className="text-xs text-cyan-600 hover:underline font-medium"
            >
              View All
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {followUps.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                <Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p>All client touchpoints and follow-ups are up to date!</p>
                <button
                  type="button"
                  onClick={() => onNavigateToModule('follow_ups')}
                  className="mt-1 text-cyan-600 font-semibold hover:underline inline-block"
                >
                  + Add follow-up reminder
                </button>
              </div>
            ) : (
              followUps.slice(0, 3).map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-xs space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{f.company_name}</span>
                    <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                      {f.channel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{f.objective}</p>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Assigned to: {f.assigned_user_name || 'Agent'}</span>
                    <span>Due: {formatDubaiDateTime(f.due_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
