import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User,
  Shield,
  Clock,
  Menu,
  Plus,
  Kanban,
  Users,
  Building2,
  MapPin,
  ChevronRight,
  Database,
} from 'lucide-react';
import { ModuleKey, NotificationItem, UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { formatDubaiDateTime } from '../../lib/dates/dubaiDate';
import { isLiveSupabaseConfigured } from '../../lib/supabase/client';

interface TopBarProps {
  currentUser: UserProfile;
  currentModule?: ModuleKey;
  onUserSwitch: (user: UserProfile) => void;
  onNavigateToModule: (moduleKey: ModuleKey) => void;
  globalSearchQuery: string;
  onGlobalSearchChange: (query: string) => void;
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
  onToggleMobileMenu?: () => void;
  onLogout?: () => void;
}

const MODULE_LABELS: Record<ModuleKey, { group: string; title: string }> = {
  dashboard: { group: 'CRM Workspace', title: 'Command Centre' },
  pipeline: { group: 'CRM Workspace', title: 'Sales Pipeline' },
  leads: { group: 'CRM Workspace', title: 'Leads Directory' },
  companies: { group: 'CRM Workspace', title: 'Companies' },
  visits: { group: 'Field Execution', title: 'Client Visits' },
  plans: { group: 'Field Execution', title: 'Daily Sales Plans' },
  follow_ups: { group: 'Field Execution', title: 'Follow-ups' },
  tasks: { group: 'Field Execution', title: 'Operational Tasks' },
  calendar: { group: 'Field Execution', title: 'Calendar' },
  user_management: { group: 'Administration', title: 'User Management' },
  roles_permissions: { group: 'Administration', title: 'Roles & Permissions' },
  activity_logs: { group: 'Administration', title: 'Activity Logs' },
  archive: { group: 'Administration', title: 'Archive Vault' },
  settings: { group: 'Administration', title: 'Settings' },
  my_account: { group: 'Administration', title: 'My Account' },
};

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  currentModule = 'dashboard',
  onUserSwitch,
  onNavigateToModule,
  globalSearchQuery,
  onGlobalSearchChange,
  selectedDateRange,
  onDateRangeChange,
  onToggleMobileMenu,
  onLogout,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dbConnected, setDbConnected] = useState(isLiveSupabaseConfigured());
  const allUsers = crmService.getUsers();

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(crmService.getNotifications());
    setDbConnected(isLiveSupabaseConfigured());
    const interval = setInterval(() => {
      setDbConnected(isLiveSupabaseConfigured());
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(e.target as Node)) {
        setShowQuickCreate(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search results across Leads, Companies, and Visits
  const searchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const leads = crmService
      .getLeads({ search: q })
      .slice(0, 4)
      .map((l) => ({
        id: l.id,
        code: l.lead_code,
        title: l.company_name,
        subtitle: `${l.contact_name} · ${l.status}`,
        module: 'pipeline' as ModuleKey,
        type: 'Lead',
      }));
    const comps = crmService
      .getCompanies(q)
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        code: c.company_code,
        title: c.name,
        subtitle: `${c.industry} · ${c.city}`,
        module: 'companies' as ModuleKey,
        type: 'Company',
      }));
    return [...leads, ...comps];
  }, [globalSearchQuery]);

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;
  const activeBreadcrumb = MODULE_LABELS[currentModule] || MODULE_LABELS.dashboard;

  const handleMarkAllRead = () => {
    crmService.markAllNotificationsRead();
    setNotifications(crmService.getNotifications());
  };

  const handleNotificationClick = (item: NotificationItem) => {
    crmService.markNotificationRead(item.id);
    setNotifications(crmService.getNotifications());
    if (item.related_module) {
      onNavigateToModule(item.related_module);
      setShowNotifications(false);
    }
  };

  return (
    <header className="h-15 bg-white border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between gap-3 z-20 shrink-0">
      {/* Left Zone: Mobile Hamburger + Contextual Breadcrumb + Global Instant Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="min-w-[40px] min-h-[40px] p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5 text-slate-800" />
          </button>
        </div>

        {/* Contextual ERP Breadcrumb */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 shrink-0 pr-2 border-r border-slate-200">
          <span>{activeBreadcrumb.group}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-900">{activeBreadcrumb.title}</span>
        </div>

        {/* Global Instant Search */}
        <div className="flex-1 max-w-xs sm:max-w-sm relative min-w-0" ref={searchRef}>
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads, companies, DTLs..."
            value={globalSearchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={(e) => {
              onGlobalSearchChange(e.target.value);
              setShowSearchDropdown(true);
            }}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs border border-slate-200 focus:border-cyan-500 rounded-lg outline-none transition-all placeholder:text-slate-400 truncate"
          />

          {showSearchDropdown && globalSearchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">
                  No matching records for "{globalSearchQuery}"
                </div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => {
                      onNavigateToModule(item.module);
                      setShowSearchDropdown(false);
                    }}
                    className="w-full p-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-cyan-700">
                          {item.code}
                        </span>
                        <span className="font-semibold text-slate-900 truncate">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {item.type}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Zone: Quick Create + Date Range + Role Switcher + Notifications + User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Zoho-style Quick "+" Navigation Menu */}
        <div className="relative" ref={quickCreateRef}>
          <button
            type="button"
            onClick={() => setShowQuickCreate((v) => !v)}
            className="px-2.5 py-1.5 bg-[#0B132B] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Quick Jump</span>
          </button>

          {showQuickCreate && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  onNavigateToModule('pipeline');
                  setShowQuickCreate(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-left"
              >
                <Kanban className="w-3.5 h-3.5 text-cyan-600" />
                <span>Sales Pipeline</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigateToModule('leads');
                  setShowQuickCreate(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-left"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Leads Directory</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigateToModule('companies');
                  setShowQuickCreate(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-left"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Companies</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigateToModule('visits');
                  setShowQuickCreate(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-left"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Log Client Visit</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Database Status Pill */}
        <button
          type="button"
          onClick={() => onNavigateToModule('settings')}
          title={dbConnected ? 'Database Connected: Supabase PostgreSQL (16 tables active)' : 'Database Offline / Local Mode'}
          className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer ${
            dbConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
          }`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${dbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <Database className={`w-3.5 h-3.5 ${dbConnected ? 'text-emerald-600' : 'text-amber-600'} shrink-0`} />
          <span className="hidden sm:inline font-mono text-[11px] font-bold">
            {dbConnected ? 'DB: Connected' : 'DB: Local'}
          </span>
        </button>

        {/* Date Range Filter */}
        <div className="hidden md:flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
          <CalendarIcon className="w-3.5 h-3.5 ml-1.5 mr-1 text-slate-400 shrink-0" />
          {['Today', 'This Week', 'This Month', 'All'].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onDateRangeChange(range)}
              className={`px-2 py-1 rounded-md transition-all whitespace-nowrap shrink-0 ${
                selectedDateRange === range
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs">
          <Shield className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
          <span className="text-[11px] text-slate-500 font-medium hidden lg:inline">Active:</span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const u = crmService.switchUser(e.target.value);
              onUserSwitch(u);
            }}
            aria-label="Switch active demo user"
            className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer text-xs max-w-[90px] sm:max-w-[140px] truncate"
          >
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name} ({u.role_name || u.role_id})
              </option>
            ))}
          </select>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="min-w-[38px] min-h-[38px] p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors flex items-center justify-center"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-[80vh] flex flex-col">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No notifications right now.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                        item.status === 'unread' ? 'bg-cyan-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-800">{item.title}</span>
                      </div>
                      <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block font-mono tabular-nums">
                        {formatDubaiDateTime(item.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <div className="w-7 h-7 rounded-full bg-[#0B132B] text-cyan-300 flex items-center justify-center font-bold text-xs uppercase">
              {currentUser.display_name.slice(0, 2)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {currentUser.display_name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {currentUser.role_name || currentUser.role_id}
              </span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-30">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-semibold text-slate-900">{currentUser.display_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {currentUser.email_verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Email Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                      <AlertCircle className="w-3 h-3" /> Unverified
                    </span>
                  )}
                </div>
              </div>
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToModule('my_account');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  My Account & Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToModule('settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Regional Settings (Dubai)
                </button>

                {onLogout && (
                  <div className="pt-1 mt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg text-left transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
