/**
 * Permission Enforcement Engine
 * Evaluates module permissions (V, C, E, D, EX) and record scope ('own', 'team', 'all')
 * Default is DENY if permission is unspecified.
 */

import { ActionPermission, ModuleKey, RecordScope, RolePermission } from '../../types/crm';

export interface EvaluationContext {
  userId: string;
  roleId: string;
  isSystemAdmin?: boolean;
  userTeamId?: string | null;
  recordOwnerId?: string | null;
  recordTeamId?: string | null;
}

/**
 * Default system permissions for built-in roles
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<ModuleKey, {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  record_scope: RecordScope;
}>> = {
  admin: {
    dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    pipeline: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    leads: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    companies: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    visits: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    plans: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    follow_ups: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    tasks: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    calendar: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    user_management: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    roles_permissions: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    activity_logs: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    settings: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
    my_account: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    archive: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, record_scope: 'all' },
  },
  sales_manager: {
    dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: true, record_scope: 'team' },
    pipeline: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, record_scope: 'team' },
    leads: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, record_scope: 'team' },
    companies: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, record_scope: 'team' },
    visits: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, record_scope: 'team' },
    plans: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, record_scope: 'team' },
    follow_ups: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, record_scope: 'team' },
    tasks: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, record_scope: 'team' },
    calendar: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: true, record_scope: 'team' },
    user_management: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
    roles_permissions: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
    activity_logs: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'team' },
    settings: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
    my_account: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    archive: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
  },
  sales_agent: {
    dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
    pipeline: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    leads: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    companies: { can_view: true, can_create: true, can_edit: false, can_delete: false, can_export: false, record_scope: 'all' },
    visits: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    plans: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    follow_ups: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    tasks: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    calendar: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    user_management: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
    roles_permissions: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
    activity_logs: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
    settings: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
    my_account: { can_view: true, can_create: true, can_edit: true, can_delete: false, can_export: false, record_scope: 'own' },
    archive: { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false, record_scope: 'own' },
  },
};

/**
 * Evaluates whether a user can perform an action on a module and optional record
 */
export function hasPermission(
  moduleKey: ModuleKey,
  action: ActionPermission,
  context: EvaluationContext,
  customPermissions?: RolePermission[]
): boolean {
  if (context.isSystemAdmin || context.roleId === 'admin') {
    return true;
  }

  let permConfig: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_export: boolean;
    record_scope: RecordScope;
  } | undefined;

  if (customPermissions && customPermissions.length > 0) {
    const found = customPermissions.find(
      (p) => p.role_id === context.roleId && p.module_key === moduleKey
    );
    if (found) {
      permConfig = found;
    }
  }

  if (!permConfig) {
    permConfig = DEFAULT_ROLE_PERMISSIONS[context.roleId]?.[moduleKey];
  }

  // Deny by default if no configuration found
  if (!permConfig) {
    return false;
  }

  // Check the action flag
  let allowed = false;
  switch (action) {
    case 'view':
      allowed = permConfig.can_view;
      break;
    case 'create':
      allowed = permConfig.can_create;
      break;
    case 'edit':
      allowed = permConfig.can_edit;
      break;
    case 'delete':
      allowed = permConfig.can_delete;
      break;
    case 'export':
      allowed = permConfig.can_export;
      break;
  }

  if (!allowed) {
    return false;
  }

  // If a specific record is being accessed, enforce record_scope
  if (context.recordOwnerId) {
    if (permConfig.record_scope === 'all') {
      return true;
    }
    if (permConfig.record_scope === 'team') {
      // Sales Manager or team member in same team
      if (context.roleId === 'sales_manager') return true;
      if (context.userTeamId && context.recordTeamId) {
        return context.userTeamId === context.recordTeamId;
      }
      return context.userId === context.recordOwnerId;
    }
    if (permConfig.record_scope === 'own') {
      return context.userId === context.recordOwnerId;
    }
  }

  return true;
}
