import React, { useState } from 'react';
import {
  LayoutDashboard,
  Kanban,
  Users,
  Building2,
  MapPin,
  Calendar,
  ClipboardList,
  CheckSquare,
  Clock,
  ShieldCheck,
  UserCheck,
  History,
  Settings,
  Archive,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ModuleKey, UserProfile } from '../../types/crm';
import { hasPermission } from '../../lib/permissions/permissionCheck';
import { crmService } from '../../services/crmService';

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'core' | 'execution' | 'governance';
  count?: number;
}

interface SidebarProps {
  currentModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  currentUser: UserProfile;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  currentUser,
  isOpenOnMobile = false,
  onCloseMobile,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const leadsCount = crmService.getLeads().length;
  const companiesCount = crmService.getCompanies().length;
  const pendingFollowUps = crmService
    .getFollowUps()
    .filter((f) => f.status === 'Pending').length;
  const openTasks = crmService
    .getTasks()
    .filter((t) => t.status !== 'Completed').length;

  const allNavItems: NavItem[] = [
    // Core CRM & Pipeline
    { key: 'dashboard', label: 'Command Centre', icon: LayoutDashboard, group: 'core' },
    { key: 'pipeline', label: 'Sales Pipeline', icon: Kanban, group: 'core', count: leadsCount },
    { key: 'leads', label: 'Leads Directory', icon: Users, group: 'core', count: leadsCount },
    { key: 'companies', label: 'Companies', icon: Building2, group: 'core', count: companiesCount },

    // Field & Execution
    { key: 'visits', label: 'Client Visits', icon: MapPin, group: 'execution' },
    { key: 'plans', label: 'Daily Plans', icon: ClipboardList, group: 'execution' },
    { key: 'follow_ups', label: 'Follow-ups', icon: Clock, group: 'execution', count: pendingFollowUps },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare, group: 'execution', count: openTasks },
    { key: 'calendar', label: 'Calendar', icon: Calendar, group: 'execution' },

    // Governance & System
    { key: 'user_management', label: 'User Management', icon: UserCheck, group: 'governance' },
    { key: 'roles_permissions', label: 'Roles & Permissions', icon: ShieldCheck, group: 'governance' },
    { key: 'activity_logs', label: 'Activity Logs', icon: History, group: 'governance' },
    { key: 'archive', label: 'Archive Vault', icon: Archive, group: 'governance' },
    { key: 'settings', label: 'Settings', icon: Settings, group: 'governance' },
    { key: 'my_account', label: 'My Account', icon: User, group: 'governance' },
  ];

  const visibleNavItems = allNavItems.filter((item) =>
    hasPermission(item.key, 'view', {
      userId: currentUser.id,
      roleId: currentUser.role_id,
      isSystemAdmin: currentUser.role_id === 'admin',
    })
  );

  const groups: { id: NavItem['group']; title: string }[] = [
    { id: 'core', title: 'CRM & Pipeline' },
    { id: 'execution', title: 'Field & Activities' },
    { id: 'governance', title: 'Administration' },
  ];

  const renderNavContent = (isMobileDrawer: boolean) => {
    const compact = !isMobileDrawer && isCollapsed;

    return (
      <div className="flex flex-col h-full">
        {/* Brand Header */}
        <div
          className={`h-15 flex items-center justify-between border-b border-slate-800/90 shrink-0 ${
            compact ? 'px-3 justify-center' : 'px-5'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.jpeg"
              alt="DAVIZ CRM"
              className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5 shrink-0 border border-slate-700/60 shadow-sm"
            />
            {!compact && (
              <div className="truncate">
                <span className="font-bold text-white tracking-tight text-sm block leading-none truncate">
                  DAVIZ CRM
                </span>
                <span className="text-[10px] text-slate-400 font-medium block mt-1 truncate">
                  Enterprise Edition · UAE
                </span>
              </div>
            )}
          </div>

          {!isMobileDrawer && !compact && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}

          {isMobileDrawer && onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-2 -mr-2 text-slate-400 hover:text-white rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <span className="text-xl font-light leading-none">✕</span>
            </button>
          )}
        </div>

        {compact && (
          <div className="py-2 flex justify-center border-b border-slate-800/60">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              title="Expand sidebar"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Categorized ERP Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {groups.map((grp) => {
            const items = visibleNavItems.filter((i) => i.group === grp.id);
            if (items.length === 0) return null;

            return (
              <div key={grp.id} className="space-y-0.5">
                {!compact && (
                  <div className="px-3 pb-1 text-[10px] font-semibold text-slate-500 tracking-wide">
                    {grp.title}
                  </div>
                )}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentModule === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      title={compact ? item.label : undefined}
                      onClick={() => {
                        onSelectModule(item.key);
                        if (isMobileDrawer && onCloseMobile) {
                          onCloseMobile();
                        }
                      }}
                      className={`w-full flex items-center gap-3 rounded-lg text-xs font-medium transition-all min-h-[38px] ${
                        compact ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-cyan-500/15 text-white font-semibold border border-cyan-500/30 shadow-2xs'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-cyan-400' : 'text-slate-400'
                        }`}
                      />
                      {!compact && (
                        <>
                          <span className="flex-1 text-left truncate whitespace-nowrap">
                            {item.label}
                          </span>
                          {typeof item.count === 'number' && item.count > 0 && (
                            <span
                              className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                isActive
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Role & Session Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070C1E]/60 shrink-0">
          <div className={`flex items-center ${compact ? 'justify-center' : 'justify-between gap-2'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-cyan-300 uppercase border border-slate-700 shrink-0">
                {currentUser.display_name.slice(0, 2)}
              </div>
              {!compact && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {currentUser.display_name}
                  </p>
                  <span className="block text-[10px] text-slate-400 capitalize truncate">
                    {currentUser.role_name || currentUser.role_id}
                  </span>
                </div>
              )}
            </div>

            {onLogout && !compact && (
              <button
                type="button"
                onClick={() => {
                  if (isMobileDrawer && onCloseMobile) onCloseMobile();
                  onLogout();
                }}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 min-h-[34px] min-w-[34px] flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:flex bg-[#0B132B] text-slate-300 flex-col shrink-0 select-none border-r border-slate-800 transition-all duration-200 ${
          isCollapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {isOpenOnMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0B132B] text-slate-300 flex flex-col z-50 shadow-2xl animate-in slide-in-from-left duration-200 border-r border-slate-800">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
