/**
 * DAVIZ SOLUTIONS CRM — COMPLETE SUPABASE POSTGRESQL MIGRATION & SEED SCRIPT
 * Timezone: Asia/Dubai (UTC+4)
 * Formats: LD-YY-MM-NNNN, VS-YY-MM-NNNN, CP-YY-MM-NNNN, etc.
 */

export const COMPLETE_MIGRATION_SQL = `-- ==============================================================================
-- DAVIZ SOLUTIONS CRM — COMPLETE PRODUCTION DATABASE MIGRATION & SEED
-- Database: Supabase PostgreSQL
-- Timezone: Asia/Dubai (UTC+4)
-- Sequences: LD-YY-MM-NNNN, VS-YY-MM-NNNN, CP-YY-MM-NNNN, PL-YY-MM-NNNN, etc.
-- ==============================================================================

SET search_path TO public, extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Monthly Sequence Generator Function (Concurrency-Safe)
CREATE TABLE IF NOT EXISTS public.id_sequences (
    prefix TEXT NOT NULL,
    year_month TEXT NOT NULL, -- Format: YY-MM (e.g. '26-10')
    last_val INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix, year_month)
);

CREATE OR REPLACE FUNCTION public.generate_monthly_code(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    v_year_month TEXT;
    v_seq INTEGER;
BEGIN
    -- Current year and month in Asia/Dubai (UTC+4)
    v_year_month := to_char(timezone('Asia/Dubai', now()), 'YY-MM');
    
    INSERT INTO public.id_sequences (prefix, year_month, last_val)
    VALUES (p_prefix, v_year_month, 1)
    ON CONFLICT (prefix, year_month)
    DO UPDATE SET last_val = id_sequences.last_val + 1
    RETURNING last_val INTO v_seq;
    
    RETURN p_prefix || '-' || v_year_month || '-' || lpad(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    phone TEXT,
    avatar_url TEXT,
    role_id TEXT NOT NULL REFERENCES public.roles(id),
    manager_id UUID REFERENCES public.profiles(id),
    team_id TEXT,
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended', 'invited')),
    profile_completed BOOLEAN NOT NULL DEFAULT false,
    profile_completed_at TIMESTAMPTZ,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Modules Catalog
CREATE TABLE IF NOT EXISTS public.modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

-- 5. Role Permissions Matrix
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id TEXT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_export BOOLEAN NOT NULL DEFAULT false,
    record_scope TEXT NOT NULL DEFAULT 'own' CHECK (record_scope IN ('own', 'team', 'all')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(role_id, module_key)
);

-- 6. Companies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    industry TEXT NOT NULL,
    website TEXT,
    linkedin_url TEXT,
    general_phone TEXT,
    general_email TEXT,
    country TEXT NOT NULL DEFAULT 'United Arab Emirates',
    emirate_state TEXT NOT NULL DEFAULT 'Dubai',
    city TEXT NOT NULL DEFAULT 'Dubai',
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    size_band TEXT,
    description TEXT,
    source TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_companies_normalized_name ON public.companies(normalized_name);

-- 7. Leads (Master Entry Table)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_code TEXT UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    contact_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    industry TEXT NOT NULL,
    website_snapshot TEXT,
    linkedin_url TEXT,
    whatsapp_number TEXT,
    country TEXT NOT NULL DEFAULT 'United Arab Emirates',
    emirate_state TEXT NOT NULL DEFAULT 'Dubai',
    city TEXT NOT NULL DEFAULT 'Dubai',
    area TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    lead_source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    assigned_to UUID REFERENCES public.profiles(id),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    details TEXT,
    estimated_value NUMERIC(15, 2) DEFAULT 0,
    last_contacted_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    archived_at TIMESTAMPTZ
);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- 8. Multiple Phones & Multiple Emails Child Tables
CREATE TABLE IF NOT EXISTS public.lead_phones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    label TEXT DEFAULT 'Mobile',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.lead_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    label TEXT DEFAULT 'Work',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. Lead Notes & Mandatory Status Change History
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id),
    note_text TEXT NOT NULL,
    visibility_scope TEXT NOT NULL DEFAULT 'team' CHECK (visibility_scope IN ('team', 'private', 'manager_only')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    related_activity_id UUID
);

CREATE TABLE IF NOT EXISTS public.lead_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    note TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 10. Client Visits
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_code TEXT UNIQUE NOT NULL,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    visit_date DATE NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id),
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Completed', 'Rescheduled', 'Cancelled', 'No Show')),
    outcome TEXT CHECK (outcome IN ('Positive', 'Neutral', 'Negative', 'Needs Follow-up', 'Opportunity Identified', 'Not Interested', 'Other')),
    discussion_summary TEXT NOT NULL,
    client_requirements TEXT,
    decision_maker_present BOOLEAN NOT NULL DEFAULT false,
    next_steps TEXT,
    follow_up_required BOOLEAN NOT NULL DEFAULT false,
    next_follow_up_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    archived_at TIMESTAMPTZ
);

-- 11. Daily Sales Plans
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code TEXT UNIQUE NOT NULL,
    owner_id UUID REFERENCES public.profiles(id),
    plan_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    lead_id UUID REFERENCES public.leads(id),
    company_id UUID REFERENCES public.companies(id),
    location TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Changes Requested', 'In Progress', 'Completed', 'Cancelled')),
    manager_comment TEXT,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 12. Follow-ups
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follow_up_code TEXT UNIQUE NOT NULL,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id),
    due_at TIMESTAMPTZ NOT NULL,
    channel TEXT NOT NULL DEFAULT 'Call',
    objective TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Rescheduled', 'Cancelled', 'Overdue')),
    priority TEXT NOT NULL DEFAULT 'medium',
    outcome_note TEXT,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id),
    next_follow_up_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 13. Operational Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES public.profiles(id),
    due_at TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Blocked', 'Completed', 'Cancelled')),
    related_entity_type TEXT,
    related_entity_id UUID,
    completion_note TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 14. Calendar Events & Attendees
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Dubai',
    created_by UUID REFERENCES public.profiles(id),
    assigned_to UUID REFERENCES public.profiles(id),
    company_id UUID REFERENCES public.companies(id),
    lead_id UUID REFERENCES public.leads(id),
    location TEXT,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    reminder_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 15. Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    record_id TEXT,
    result TEXT NOT NULL CHECK (result IN ('Success', 'Failure', 'Denied')),
    description TEXT NOT NULL,
    details JSONB
);

-- 16. Archive Index
CREATE TABLE IF NOT EXISTS public.archive_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_id TEXT UNIQUE NOT NULL,
    entity_type TEXT NOT NULL,
    original_record_id UUID NOT NULL,
    original_record_code TEXT NOT NULL,
    sheet_name TEXT NOT NULL,
    sheet_row_reference TEXT,
    payload_hash TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'archived' CHECK (status IN ('archived', 'restored', 'failed')),
    archived_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    restored_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id)
);

-- ==============================================================================
-- CLEAN PRODUCTION SEED DATA (System Roles, Modules & Permissions Matrix)
-- ==============================================================================

INSERT INTO public.roles (id, name, description, is_system_role)
VALUES
    ('admin', 'Administrator', 'Full system and company-wide access across all modules, settings, and logs.', true),
    ('sales_manager', 'Sales Manager', 'Team-wide sales pipeline, all leads, notes, visits, plans review, and reports.', true),
    ('sales_agent', 'Sales Agent', 'Assigned leads, visit reports, daily plans, follow-ups, and calendar tasks.', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO public.modules (id, name, description, sort_order)
VALUES
    ('dashboard', 'Command Centre Dashboard', 'Executive KPI dashboard and pipeline metrics', 1),
    ('pipeline', 'Sales Pipeline', 'Kanban board, stage blueprint, and conversion funnel', 2),
    ('leads', 'Leads & Pipeline', 'Master lead tracking and status lifecycle', 3),
    ('companies', 'Companies', 'Enterprise account directory', 4),
    ('visits', 'Client Visits', 'Physical client visit logs and outcomes', 5),
    ('plans', 'Daily Plans', 'Sales schedule and manager review', 6),
    ('follow_ups', 'Follow-ups', 'Actionable client reminders', 7),
    ('tasks', 'Operational Tasks', 'Work items and deliverables', 8),
    ('calendar', 'Calendar', 'Appointments and scheduling', 9),
    ('user_management', 'User Management', 'Employee account administration', 10),
    ('roles_permissions', 'Roles & Permissions', 'Action matrix and record scoping', 11),
    ('activity_logs', 'Activity Logs', 'Security audit trail', 12),
    ('settings', 'Settings', 'Global CRM configuration', 13),
    ('archive', 'Archive Vault', 'Google Sheets storage index', 14),
    ('my_account', 'My Account', 'Personal profile and verification', 15)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

INSERT INTO public.role_permissions (role_id, module_key, can_view, can_create, can_edit, can_delete, can_export, record_scope)
VALUES
    -- Admin
    ('admin', 'dashboard', true, true, true, true, true, 'all'),
    ('admin', 'pipeline', true, true, true, true, true, 'all'),
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
    ('sales_manager', 'pipeline', true, true, true, false, true, 'team'),
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
    ('sales_agent', 'pipeline', true, true, true, false, false, 'own'),
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

-- Initial default administrator profile
INSERT INTO public.profiles (username, display_name, email, email_verified, phone, role_id, account_status, profile_completed)
VALUES ('admin', 'David Vance (Admin)', 'admin@daviz.ae', true, '+971 50 111 2233', 'admin', 'active', true)
ON CONFLICT (username) DO NOTHING;

-- Grant Schema & Table Access for Supabase PostgREST API
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Reload PostgREST Schema Cache immediately
NOTIFY pgrst, 'reload schema';
`;
