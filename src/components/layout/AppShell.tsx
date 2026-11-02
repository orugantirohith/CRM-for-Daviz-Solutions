import React, { useState } from 'react';
import { ModuleKey, UserProfile } from '../../types/crm';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { FloatingChatPanel } from '../chat/FloatingChatPanel';
import { DashboardView } from '../../features/dashboard/DashboardView';
import { SalesPipelineView } from '../../features/pipeline/SalesPipelineView';
import { LeadListView } from '../../features/leads/LeadListView';
import { CompanyListView } from '../../features/companies/CompanyListView';
import { VisitListView } from '../../features/visits/VisitListView';
import { PlanListView } from '../../features/plans/PlanListView';
import { FollowUpListView } from '../../features/follow-ups/FollowUpListView';
import { TaskListView } from '../../features/tasks/TaskListView';
import { CalendarView } from '../../features/calendar/CalendarView';
import { UserManagementView } from '../../features/user-management/UserManagementView';
import { RolesPermissionsView } from '../../features/roles-permissions/RolesPermissionsView';
import { ActivityLogsView } from '../../features/activity-logs/ActivityLogsView';
import { SettingsView } from '../../features/settings/SettingsView';
import { ArchiveView } from '../../features/archive/ArchiveView';
import { MyAccountView } from '../../features/my-account/MyAccountView';
import { LoginView } from '../../features/auth/LoginView';
import { ProfileSetupView } from '../../features/auth/ProfileSetupView';
import { crmService } from '../../services/crmService';
import { hasPermission } from '../../lib/permissions/permissionCheck';

import {
  LayoutDashboard,
  Kanban,
  Users,
  MapPin,
  Menu,
  ShieldAlert,
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    crmService.getAuthenticatedUser()
  );
  const [currentModule, setCurrentModule] = useState<ModuleKey>('dashboard');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('This Month');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    const unsubscribe = crmService.subscribe(() => {
      const latestAuth = crmService.getAuthenticatedUser();
      setCurrentUser((prev) => (latestAuth ? { ...latestAuth } : prev ? { ...prev } : null));
    });
    return unsubscribe;
  }, []);

  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  if (!currentUser.profile_completed) {
    return (
      <ProfileSetupView
        currentUser={currentUser}
        onProfileComplete={(updated) => {
          setCurrentUser(updated);
        }}
        onBackToLogin={() => {
          crmService.logout();
          setCurrentUser(null);
        }}
      />
    );
  }

  const handleLogout = () => {
    crmService.logout();
    setCurrentUser(null);
  };

  const isModuleAllowed = hasPermission(currentModule, 'view', {
    userId: currentUser.id,
    roleId: currentUser.role_id,
    isSystemAdmin: currentUser.role_id === 'admin',
  });

  const renderModuleContent = () => {
    if (!isModuleAllowed) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Access Restricted</h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            This module is reserved for administrators only. Sales agents are restricted from accessing system governance or other agents' data.
          </p>
          <button
            type="button"
            onClick={() => setCurrentModule('dashboard')}
            className="px-4 py-2 bg-[#0B132B] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Return to Command Centre
          </button>
        </div>
      );
    }

    switch (currentModule) {
      case 'dashboard':
        return (
          <DashboardView
            currentUser={currentUser}
            selectedDateRange={selectedDateRange}
            onNavigateToModule={(mod) => setCurrentModule(mod)}
          />
        );
      case 'pipeline':
        return (
          <SalesPipelineView
            currentUser={currentUser}
            onNavigateToModule={(mod) => setCurrentModule(mod)}
          />
        );
      case 'leads':
        return (
          <LeadListView
            currentUser={currentUser}
            onNavigateToModule={(mod) => setCurrentModule(mod)}
          />
        );
      case 'companies':
        return <CompanyListView currentUser={currentUser} />;
      case 'visits':
        return <VisitListView currentUser={currentUser} />;
      case 'plans':
        return <PlanListView currentUser={currentUser} />;
      case 'follow_ups':
        return <FollowUpListView currentUser={currentUser} />;
      case 'tasks':
        return <TaskListView currentUser={currentUser} />;
      case 'calendar':
        return <CalendarView currentUser={currentUser} />;
      case 'user_management':
        return <UserManagementView currentUser={currentUser} />;
      case 'roles_permissions':
        return <RolesPermissionsView currentUser={currentUser} />;
      case 'activity_logs':
        return <ActivityLogsView currentUser={currentUser} />;
      case 'settings':
        return <SettingsView currentUser={currentUser} />;
      case 'archive':
        return <ArchiveView currentUser={currentUser} />;
      case 'my_account':
        return (
          <MyAccountView
            currentUser={currentUser}
            onUserUpdated={(updated) => setCurrentUser(updated)}
          />
        );
      default:
        return (
          <DashboardView
            currentUser={currentUser}
            selectedDateRange={selectedDateRange}
            onNavigateToModule={(mod) => setCurrentModule(mod)}
          />
        );
    }
  };

  const mobileNavItems = [
    { key: 'dashboard' as ModuleKey, label: 'Centre', icon: LayoutDashboard },
    { key: 'pipeline' as ModuleKey, label: 'Pipeline', icon: Kanban },
    { key: 'leads' as ModuleKey, label: 'Leads', icon: Users },
    { key: 'visits' as ModuleKey, label: 'Visits', icon: MapPin },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F6F9] font-sans text-slate-800">
      <Sidebar
        currentModule={currentModule}
        onSelectModule={(mod) => setCurrentModule(mod)}
        currentUser={currentUser}
        isOpenOnMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <TopBar
          currentUser={currentUser}
          currentModule={currentModule}
          onUserSwitch={(newUser) => setCurrentUser(newUser)}
          onNavigateToModule={(mod) => setCurrentModule(mod)}
          globalSearchQuery={globalSearchQuery}
          onGlobalSearchChange={setGlobalSearchQuery}
          selectedDateRange={selectedDateRange}
          onDateRangeChange={setSelectedDateRange}
          onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
          onLogout={handleLogout}
        />

        <main
          key={currentModule}
          className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 pb-24 lg:pb-8 animate-crm-view"
        >
          {renderModuleContent()}
        </main>

        {/* Mobile Sticky Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-15 bg-[#0B132B] border-t border-slate-800/90 flex items-center justify-around z-30 px-2 shadow-2xl">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentModule === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setCurrentModule(item.key)}
                className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
                  isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
              mobileMenuOpen ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        </nav>
      </div>

      <FloatingChatPanel currentUser={currentUser} />
    </div>
  );
};
