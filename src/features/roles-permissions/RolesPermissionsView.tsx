import React, { useState } from 'react';
import { Shield, ShieldCheck, Save, RotateCcw, Plus, Check, AlertCircle } from 'lucide-react';
import { ModuleKey, RecordScope, UserProfile } from '../../types/crm';
import { DEFAULT_ROLE_PERMISSIONS } from '../../lib/permissions/permissionCheck';
import { crmService } from '../../services/crmService';

interface RolesPermissionsViewProps {
  currentUser: UserProfile;
}

const MODULES_LIST: { key: ModuleKey; label: string }[] = [
  { key: 'dashboard', label: 'Command Centre Dashboard' },
  { key: 'pipeline', label: 'Sales Pipeline (Kanban & Blueprint)' },
  { key: 'leads', label: 'Leads Directory' },
  { key: 'companies', label: 'Companies' },
  { key: 'visits', label: 'Physical Client Visits' },
  { key: 'plans', label: 'Daily Sales Plans' },
  { key: 'follow_ups', label: 'Follow-ups' },
  { key: 'tasks', label: 'Operational Tasks' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'user_management', label: 'User Management' },
  { key: 'roles_permissions', label: 'Roles & Permissions' },
  { key: 'activity_logs', label: 'Activity Logs' },
  { key: 'settings', label: 'Global Settings' },
  { key: 'archive', label: 'Archive Management Vault' },
  { key: 'my_account', label: 'My Account' },
];

export const RolesPermissionsView: React.FC<RolesPermissionsViewProps> = ({ currentUser }) => {
  if (currentUser.role_id !== 'admin') {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Administrator Access Required</h3>
        <p className="text-xs text-slate-500 mb-2">
          Only system administrators are authorized to configure role permissions.
        </p>
      </div>
    );
  }

  const [roles, setRoles] = useState(() => crmService.getRoles());
  const [selectedRoleId, setSelectedRoleId] = useState<string>('sales_manager');
  const [matrixState, setMatrixState] = useState(() => crmService.getRolePermissions());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Add Role Modal State
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);

  const currentRoleMatrix = matrixState[selectedRoleId] || DEFAULT_ROLE_PERMISSIONS.sales_agent;

  const handleToggle = (moduleKey: ModuleKey, actionKey: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_export') => {
    if (selectedRoleId === 'admin') {
      alert('Security Protection: Administrator permissions are immutable to prevent system lockout.');
      return;
    }

    const updatedRoleConfig = {
      ...currentRoleMatrix,
      [moduleKey]: {
        ...currentRoleMatrix[moduleKey],
        [actionKey]: !currentRoleMatrix[moduleKey][actionKey],
      },
    };

    setMatrixState({
      ...matrixState,
      [selectedRoleId]: updatedRoleConfig,
    });
    setHasUnsavedChanges(true);
  };

  const handleScopeChange = (moduleKey: ModuleKey, scope: RecordScope) => {
    if (selectedRoleId === 'admin') return;

    const updatedRoleConfig = {
      ...currentRoleMatrix,
      [moduleKey]: {
        ...currentRoleMatrix[moduleKey],
        record_scope: scope,
      },
    };

    setMatrixState({
      ...matrixState,
      [selectedRoleId]: updatedRoleConfig,
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    crmService.saveRolePermissions(matrixState);
    setHasUnsavedChanges(false);
    setSaveSuccessMsg(`Permissions successfully saved and applied for role "${selectedRoleId}".`);
    crmService.logActivity({
      action: 'PERMISSION_CHANGE',
      module: 'roles_permissions',
      record_id: selectedRoleId,
      result: 'Success',
      description: `Admin ${currentUser.display_name} updated the permission matrix for role "${selectedRoleId}".`,
    });
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleReset = () => {
    setMatrixState(crmService.getRolePermissions());
    setHasUnsavedChanges(false);
  };

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError(null);
    if (!newRoleName.trim()) {
      setRoleError('Please provide a descriptive role name.');
      return;
    }

    try {
      const created = crmService.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
      });
      setRoles(crmService.getRoles());
      setMatrixState(crmService.getRolePermissions());
      setSelectedRoleId(created.id);
      setIsAddRoleOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setSaveSuccessMsg(`Role "${created.name}" created successfully and saved.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setRoleError(err.message || 'Failed to create role.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Roles & Permissions Matrix</h2>
          <p className="text-xs text-slate-500">
            Granular action controls (View, Create, Edit, Delete, Export) and record scoping (Own, Team, All)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard Changes</span>
            </button>
          )}

          <button
            type="button"
            disabled={!hasUnsavedChanges}
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all ${
              hasUnsavedChanges
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Permission Matrix</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Role Selector Tabs */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-700">Target Role:</span>
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setSelectedRoleId(r.id);
                  setHasUnsavedChanges(false);
                }}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedRoleId === r.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsAddRoleOpen(true)}
            className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Role</span>
          </button>
        </div>

        {hasUnsavedChanges && (
          <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes pending
          </span>
        )}
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 w-1/3">CRM Module</th>
              <th className="py-3 px-3 text-center">V (View)</th>
              <th className="py-3 px-3 text-center">C (Create)</th>
              <th className="py-3 px-3 text-center">E (Edit)</th>
              <th className="py-3 px-3 text-center">D (Delete)</th>
              <th className="py-3 px-3 text-center">EX (Export)</th>
              <th className="py-3 px-4 text-left">Record Scope</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {MODULES_LIST.map((mod) => {
              const perm = currentRoleMatrix[mod.key] || {
                can_view: false,
                can_create: false,
                can_edit: false,
                can_delete: false,
                can_export: false,
                record_scope: 'own',
              };

              return (
                <tr key={mod.key} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{mod.label}</td>

                  {/* V */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={perm.can_view}
                      onChange={() => handleToggle(mod.key, 'can_view')}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>

                  {/* C */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={perm.can_create}
                      onChange={() => handleToggle(mod.key, 'can_create')}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>

                  {/* E */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={perm.can_edit}
                      onChange={() => handleToggle(mod.key, 'can_edit')}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>

                  {/* D */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={perm.can_delete}
                      onChange={() => handleToggle(mod.key, 'can_delete')}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>

                  {/* EX */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={perm.can_export}
                      onChange={() => handleToggle(mod.key, 'can_export')}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </td>

                  {/* Record Scope */}
                  <td className="py-3 px-4">
                    <select
                      value={perm.record_scope}
                      onChange={(e) => handleScopeChange(mod.key, e.target.value as RecordScope)}
                      className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-[11px] font-medium outline-none text-slate-800"
                    >
                      <option value="own">Own Records</option>
                      <option value="team">Team Records</option>
                      <option value="all">All Company Records</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Role Modal */}
      {isAddRoleOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-100 rounded-xl text-cyan-800">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create New Role</h3>
                  <p className="text-[11px] text-slate-500">Add an organizational role to the permissions matrix</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRoleOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="p-5 space-y-4 text-xs">
              {roleError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{roleError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Account Executive"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Responsibilities, scope, and access boundaries..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddRoleOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save New Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
