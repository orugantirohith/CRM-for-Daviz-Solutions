// Self-contained Vercel Serverless Function for /api/migration-sql
// Zero top-level imports so Node.js ESM on Vercel never crashes before handler() executes.

const COMPLETE_MIGRATION_SQL = `-- ==============================================================================
-- DAVIZ SOLUTIONS CRM — COMPLETE PRODUCTION DATABASE MIGRATION & SEED
-- Database: Supabase PostgreSQL
-- Timezone: Asia/Dubai (UTC+4)
-- ==============================================================================

SET search_path TO public, extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.id_sequences (
    prefix TEXT NOT NULL,
    year_month TEXT NOT NULL,
    last_val INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix, year_month)
);

CREATE OR REPLACE FUNCTION public.generate_monthly_code(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    v_year_month TEXT;
    v_seq INTEGER;
BEGIN
    v_year_month := to_char(timezone('Asia/Dubai', now()), 'YY-MM');
    INSERT INTO public.id_sequences (prefix, year_month, last_val)
    VALUES (p_prefix, v_year_month, 1)
    ON CONFLICT (prefix, year_month)
    DO UPDATE SET last_val = id_sequences.last_val + 1
    RETURNING last_val INTO v_seq;
    RETURN p_prefix || '-' || v_year_month || '-' || lpad(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

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

CREATE TABLE IF NOT EXISTS public.modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

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

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;

export default async function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(COMPLETE_MIGRATION_SQL);
}
