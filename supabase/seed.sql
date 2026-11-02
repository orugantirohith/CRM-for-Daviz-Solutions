-- DAVIZ SOLUTIONS CRM — CLEAN PRODUCTION SEED (Zero Demo Data)
-- Timezone: Asia/Dubai (UTC+4)

-- 1. Built-in Roles
INSERT INTO public.roles (id, name, description, is_system_role)
VALUES
    ('admin', 'Administrator', 'Full system and company-wide access across all modules, settings, and logs.', true),
    ('sales_manager', 'Sales Manager', 'Team-wide sales pipeline, all leads, notes, visits, plans review, and reports.', true),
    ('sales_agent', 'Sales Agent', 'Assigned leads, visit reports, daily plans, follow-ups, and calendar tasks.', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. Modules Catalog
CREATE TABLE IF NOT EXISTS public.modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

INSERT INTO public.modules (id, name, description, sort_order)
VALUES
    ('dashboard', 'Command Centre Dashboard', 'Executive KPI dashboard and pipeline metrics', 1),
    ('leads', 'Leads & Pipeline', 'Lead tracking and status lifecycle', 2),
    ('companies', 'Companies', 'Enterprise account directory', 3),
    ('visits', 'Client Visits', 'Physical client visit logs and outcomes', 4),
    ('plans', 'Daily Plans', 'Sales schedule and manager review', 5),
    ('follow_ups', 'Follow-ups', 'Actionable client reminders', 6),
    ('tasks', 'Operational Tasks', 'Work items and deliverables', 7),
    ('calendar', 'Calendar', 'Appointments and scheduling', 8),
    ('user_management', 'User Management', 'Employee account administration', 9),
    ('roles_permissions', 'Roles & Permissions', 'Action matrix and record scoping', 10),
    ('activity_logs', 'Activity Logs', 'Security audit trail', 11),
    ('settings', 'Settings', 'Global CRM configuration', 12),
    ('archive', 'Archive Vault', 'Google Sheets storage index', 13),
    ('my_account', 'My Account', 'Personal profile and verification', 14)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

-- 3. Default Role Permissions Matrix
INSERT INTO public.role_permissions (role_id, module_key, can_view, can_create, can_edit, can_delete, can_export, record_scope)
VALUES
    -- Admin (All permissions)
    ('admin', 'dashboard', true, true, true, true, true, 'all'),
    ('admin', 'leads', true, true, true, true, true, 'all'),
    ('admin', 'companies', true, true, true, true, true, 'all'),
    ('admin', 'visits', true, true, true, true, true, 'all'),
    ('admin', 'plans', true, true, true, true, true, 'all'),
    ('admin', 'follow_ups', true, true, true, true, true, 'all'),
    ('admin', 'tasks', true, true, true, true, true, 'all'),
    ('admin', 'calendar', true, true, true, true, true, 'all'),
    ('admin', 'user_management', true, true, true, true, true, 'all'),
    ('admin', 'roles_permissions', true, true, true, true, true, 'all'),
    ('admin', 'activity_logs', true, true, true, true, true, 'all'),
    ('admin', 'settings', true, true, true, true, true, 'all'),
    ('admin', 'archive', true, true, true, true, true, 'all'),
    ('admin', 'my_account', true, true, true, false, false, 'own'),

    -- Sales Manager
    ('sales_manager', 'dashboard', true, false, false, false, true, 'team'),
    ('sales_manager', 'leads', true, true, true, false, true, 'team'),
    ('sales_manager', 'companies', true, true, true, false, true, 'team'),
    ('sales_manager', 'visits', true, true, true, false, true, 'team'),
    ('sales_manager', 'plans', true, true, true, false, true, 'team'),
    ('sales_manager', 'follow_ups', true, true, true, false, true, 'team'),
    ('sales_manager', 'tasks', true, true, true, false, true, 'team'),
    ('sales_manager', 'calendar', true, true, true, false, true, 'team'),
    ('sales_manager', 'user_management', false, false, false, false, false, 'own'),
    ('sales_manager', 'roles_permissions', false, false, false, false, false, 'own'),
    ('sales_manager', 'activity_logs', true, false, false, false, false, 'team'),
    ('sales_manager', 'settings', false, false, false, false, false, 'own'),
    ('sales_manager', 'archive', false, false, false, false, false, 'own'),
    ('sales_manager', 'my_account', true, true, true, false, false, 'own'),

    -- Sales Agent
    ('sales_agent', 'dashboard', true, false, false, false, false, 'own'),
    ('sales_agent', 'leads', true, true, true, false, false, 'own'),
    ('sales_agent', 'companies', true, true, false, false, false, 'all'),
    ('sales_agent', 'visits', true, true, true, false, false, 'own'),
    ('sales_agent', 'plans', true, true, true, false, false, 'own'),
    ('sales_agent', 'follow_ups', true, true, true, false, false, 'own'),
    ('sales_agent', 'tasks', true, true, true, false, false, 'own'),
    ('sales_agent', 'calendar', true, true, true, false, false, 'own'),
    ('sales_agent', 'user_management', false, false, false, false, false, 'own'),
    ('sales_agent', 'roles_permissions', false, false, false, false, false, 'own'),
    ('sales_agent', 'activity_logs', false, false, false, false, false, 'own'),
    ('sales_agent', 'settings', false, false, false, false, false, 'own'),
    ('sales_agent', 'archive', false, false, false, false, false, 'own'),
    ('sales_agent', 'my_account', true, true, true, false, false, 'own')
ON CONFLICT (role_id, module_key) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_export = EXCLUDED.can_export,
    record_scope = EXCLUDED.record_scope;

-- Notice: Zero demo leads, companies, visits, or tasks are inserted.
-- The database is now ready for production operations.
