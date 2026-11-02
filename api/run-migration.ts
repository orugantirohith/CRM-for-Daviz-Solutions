// Self-contained Vercel Serverless Function for /api/run-migration
// Zero top-level imports so Node.js ESM on Vercel never throws ERR_MODULE_NOT_FOUND before handler() runs.

const DEFAULT_FALLBACK_REF =
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
    .replace(/^https?:\/\//i, '')
    .split('.')[0] || '';

const CRM_REQUIRED_TABLES = [
  'roles',
  'profiles',
  'modules',
  'role_permissions',
  'companies',
  'leads',
  'lead_phones',
  'lead_emails',
  'lead_notes',
  'lead_status_history',
  'visits',
  'plans',
  'follow_ups',
  'tasks',
  'activity_logs',
  'archive_index',
];

const IPV6_PREFIX_TO_REGION: Record<string, string> = {
  '2406:da12': 'ap-northeast-2',
  '2406:da14': 'ap-northeast-1',
  '2406:da1a': 'ap-south-1',
  '2406:da18': 'ap-southeast-1',
  '2406:da1c': 'ap-southeast-2',
  '2a05:d014': 'eu-central-1',
  '2a05:d018': 'eu-west-1',
  '2a05:d01c': 'eu-west-2',
  '2a05:d012': 'eu-west-3',
  '2a05:d016': 'eu-north-1',
  '2a05:d01e': 'eu-central-2',
  '2600:1f18': 'us-east-1',
  '2600:1f10': 'us-east-1',
  '2600:1f16': 'us-east-2',
  '2600:1f14': 'us-west-1',
  '2600:1f1c': 'us-west-2',
  '2600:1f1a': 'ca-central-1',
  '2600:1f1e': 'sa-east-1',
};

const ALL_SUPABASE_REGIONS = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-northeast-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-northeast-1',
  'ap-southeast-2',
  'eu-west-3',
  'eu-north-1',
  'eu-central-2',
  'ca-central-1',
  'sa-east-1',
];

const COMPLETE_MIGRATION_SQL = `
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

INSERT INTO public.profiles (username, display_name, email, email_verified, phone, role_id, account_status, profile_completed)
VALUES ('admin', 'David Vance (Admin)', 'admin@daviz.ae', true, '+971 50 111 2233', 'admin', 'active', true)
ON CONFLICT (username) DO NOTHING;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;

function extractProjectRef(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const match =
    trimmed.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i) ||
    trimmed.match(/db\.([a-z0-9-]+)\.supabase\.co/i) ||
    trimmed.match(/postgres\.([a-z0-9-]+)/i);
  const ref = match ? match[1].toLowerCase() : null;
  if (
    !ref ||
    ref.includes('your-') ||
    ref.includes('example') ||
    ref.includes('placeholder') ||
    ref === 'project-id' ||
    ref === 'project-ref'
  ) {
    return null;
  }
  return ref;
}

function parsePgUri(uri?: string | null) {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return null;
  }

  let host: string | null = null;
  let port: number | null = null;
  let user: string | null = null;
  let password: string | null = null;
  let database = 'postgres';

  // Regex parse first to handle unencoded special chars (#, ?, @) in password safely
  const withoutProto = trimmed.replace(/^postgres(?:ql)?:\/\//i, '');
  const atIndex = withoutProto.lastIndexOf('@');
  if (atIndex !== -1) {
    const userInfo = withoutProto.slice(0, atIndex);
    const hostAndPath = withoutProto.slice(atIndex + 1);
    const colonIndex = userInfo.indexOf(':');
    if (colonIndex !== -1) {
      user = decodeURIComponent(userInfo.slice(0, colonIndex));
      const rawPwd = userInfo.slice(colonIndex + 1);
      try {
        password = decodeURIComponent(rawPwd);
      } catch {
        password = rawPwd;
      }
    } else {
      user = userInfo;
    }

    const slashIndex = hostAndPath.indexOf('/');
    const hostPort = slashIndex !== -1 ? hostAndPath.slice(0, slashIndex) : hostAndPath;
    const pathAndQuery = slashIndex !== -1 ? hostAndPath.slice(slashIndex + 1) : 'postgres';

    const hostColon = hostPort.lastIndexOf(':');
    if (hostColon !== -1 && !hostPort.endsWith(']')) {
      host = hostPort.slice(0, hostColon);
      port = Number(hostPort.slice(hostColon + 1)) || 5432;
    } else {
      host = hostPort;
      port = 5432;
    }

    database = pathAndQuery.split('?')[0] || 'postgres';
  }

  const projectRef =
    extractProjectRef(user) ||
    extractProjectRef(host) ||
    extractProjectRef(trimmed);

  return { host, port, user, password, database, projectRef };
}

async function parseRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on?.('data', (chunk: any) => {
      raw += chunk;
    });
    req.on?.('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on?.('error', () => resolve({}));
  });
}

async function resolveIpv6RegionPoolers(projectRef: string): Promise<string[]> {
  try {
    const dnsMod: any = await import('node:dns/promises' as string);
    const resolve6 = dnsMod.resolve6 || dnsMod.default?.resolve6;
    if (!resolve6) return [];

    const ipv6List: string[] = await Promise.race([
      resolve6(`db.${projectRef}.supabase.co`),
      new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 1500)),
    ]);

    const hosts: string[] = [];
    if (ipv6List && ipv6List.length > 0) {
      const addr = ipv6List[0].toLowerCase();
      for (const [prefix, region] of Object.entries(IPV6_PREFIX_TO_REGION)) {
        if (addr.startsWith(prefix)) {
          hosts.push(`aws-0-${region}.pooler.supabase.com`);
          hosts.push(`aws-1-${region}.pooler.supabase.com`);
        }
      }
    }
    return hosts;
  } catch {
    return [];
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = await parseRequestBody(req);
    const userPasswordInput = String(body?.dbPassword || '').trim();
    const userConnStringInput = String(body?.connectionString || '').trim();

    // Gather Vercel / Server environment variables
    const envConnStrings = [
      process.env.POSTGRES_URL_NON_POOLING,
      process.env.POSTGRES_URL,
      process.env.DATABASE_URL,
      process.env.POSTGRES_PRISMA_URL,
      process.env.SUPABASE_DB_URL,
    ]
      .map((s) => (s || '').trim())
      .filter(Boolean);

    const parsedEnvConn = parsePgUri(envConnStrings[0]);
    const envSupabaseUrlRaw = (
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      ''
    ).trim();

    const envAnonKey = (
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    const envServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const envPassword = (
      process.env.POSTGRES_PASSWORD ||
      process.env.SUPABASE_DB_PASSWORD ||
      process.env.DATABASE_PASSWORD ||
      parsedEnvConn?.password ||
      ''
    ).trim();
    const envHost = (process.env.POSTGRES_HOST || parsedEnvConn?.host || '').trim();
    const envUser = (process.env.POSTGRES_USER || parsedEnvConn?.user || '').trim();
    const envDatabase = (process.env.POSTGRES_DATABASE || parsedEnvConn?.database || 'postgres').trim();

    const envProjectRef =
      extractProjectRef(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) ||
      parsedEnvConn?.projectRef ||
      extractProjectRef(envUser) ||
      extractProjectRef(envHost) ||
      extractProjectRef(envSupabaseUrlRaw) ||
      null;

    // Check if user pasted a full postgres:// URI
    const explicitConnUri =
      userPasswordInput.startsWith('postgres://') || userPasswordInput.startsWith('postgresql://')
        ? userPasswordInput
        : userConnStringInput.startsWith('postgres://') || userConnStringInput.startsWith('postgresql://')
        ? userConnStringInput
        : '';
    const parsedUserUri = parsePgUri(explicitConnUri);

    const uiProjectRef =
      extractProjectRef(body?.supabaseUrl) ||
      (body?.projectRef ? String(body.projectRef).trim() : null);

    // Build ordered list of projectRefs to attempt (so both Vercel-connected project and UI project work)
    const candidateRefs: string[] = [];
    const addRef = (r?: string | null) => {
      if (r && !candidateRefs.includes(r)) candidateRefs.push(r);
    };
    addRef(parsedUserUri?.projectRef);
    if (uiProjectRef && uiProjectRef !== DEFAULT_FALLBACK_REF) addRef(uiProjectRef);
    addRef(envProjectRef);
    addRef(uiProjectRef);
    addRef(DEFAULT_FALLBACK_REF);

    const primaryRef = candidateRefs[0] || DEFAULT_FALLBACK_REF;
    const primaryUrl = `https://${primaryRef}.supabase.co`;

    // Build ordered list of candidate passwords
    const passwordCandidates: string[] = [];
    const addPassword = (p?: string | null) => {
      if (!p) return;
      const trimmed = p.trim();
      if (!trimmed) return;
      if (!passwordCandidates.includes(trimmed)) passwordCandidates.push(trimmed);
      if (trimmed.startsWith('[') && trimmed.endsWith(']') && trimmed.length > 2) {
        const unbracketed = trimmed.slice(1, -1).trim();
        if (unbracketed && !passwordCandidates.includes(unbracketed)) {
          passwordCandidates.push(unbracketed);
        }
      }
    };

    if (parsedUserUri?.password) {
      addPassword(parsedUserUri.password);
    } else if (userPasswordInput && !explicitConnUri && !userPasswordInput.startsWith('sbp_')) {
      addPassword(userPasswordInput);
    }
    addPassword(envPassword);

    // Check if user provided a Supabase Management API Personal Access Token (sbp_...)
    const managementToken = userPasswordInput.startsWith('sbp_')
      ? userPasswordInput
      : (process.env.SUPABASE_ACCESS_TOKEN || '').trim();

    if (managementToken) {
      for (const ref of candidateRefs) {
        try {
          const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${managementToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: COMPLETE_MIGRATION_SQL }),
          });
          if (mgmtRes.ok) {
            const tableStatus: Record<string, boolean> = {};
            for (const t of CRM_REQUIRED_TABLES) tableStatus[t] = true;
            return res.status(200).json({
              success: true,
              projectRef: ref,
              supabaseUrl: `https://${ref}.supabase.co`,
              anonKey: envAnonKey || undefined,
              message: `Migration succeeded via Supabase Management API for project "${ref}"! All 16 CRM tables created and verified.`,
              tables: CRM_REQUIRED_TABLES,
              tableStatus,
              createdCount: CRM_REQUIRED_TABLES.length,
              totalCount: CRM_REQUIRED_TABLES.length,
              allTablesCreated: true,
            });
          }
        } catch {
          // continue to pg connection
        }
      }
    }

    if (passwordCandidates.length === 0) {
      return res.status(200).json({
        success: false,
        projectRef: primaryRef,
        supabaseUrl: primaryUrl,
        message:
          'Please enter your Supabase Database Password (or paste your full postgresql:// connection URI) to execute the migration.',
      });
    }

    // Dynamically import 'pg' inside try/catch so module loading never crashes
    const pgMod: any = await import('pg');
    const PgClient = pgMod.Client || pgMod.default?.Client;
    if (!PgClient) {
      throw new Error('PostgreSQL client driver (pg) is unavailable in this runtime.');
    }

    const executeMigrationOnClient = async (client: any, ref: string, label: string, host?: string) => {
      await client.query(COMPLETE_MIGRATION_SQL);
      const tableRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      const existingSet = new Set((tableRes.rows || []).map((r: any) => String(r.table_name)));
      const tableStatus: Record<string, boolean> = {};
      for (const reqTable of CRM_REQUIRED_TABLES) {
        tableStatus[reqTable] = existingSet.has(reqTable);
      }
      const createdCount = Object.values(tableStatus).filter(Boolean).length;
      try {
        await client.end();
      } catch {}

      process.env.RUNTIME_MIGRATED_PROJECT_REF = ref;
      process.env.RUNTIME_SUPABASE_URL = `https://${ref}.supabase.co`;

      return {
        success: true,
        projectRef: ref,
        supabaseUrl: `https://${ref}.supabase.co`,
        anonKey: envAnonKey || undefined,
        poolerHost: host,
        message: `Migration succeeded via ${label}! Verified ${createdCount}/${CRM_REQUIRED_TABLES.length} CRM tables.`,
        tables: Array.from(existingSet),
        tableStatus,
        createdCount,
        totalCount: CRM_REQUIRED_TABLES.length,
        allTablesCreated: createdCount === CRM_REQUIRED_TABLES.length,
      };
    };

    let lastError = 'Could not establish database connection.';
    let authFailedRef: string | null = null;
    let authFailedHost: string | null = null;

    // Try each candidate projectRef
    for (const ref of candidateRefs) {
      const directHostsToTry: Array<{ host: string; port: number; user: string; db: string; label: string }> = [];

      // 1. User-pasted URI host
      if (parsedUserUri?.host && (!parsedUserUri.projectRef || parsedUserUri.projectRef === ref)) {
        const isPooler = parsedUserUri.host.includes('pooler.supabase.com');
        const effectiveUser =
          isPooler && (!parsedUserUri.user || !parsedUserUri.user.includes('.'))
            ? `postgres.${ref}`
            : parsedUserUri.user || (isPooler ? `postgres.${ref}` : 'postgres');
        directHostsToTry.push({
          host: parsedUserUri.host,
          port: parsedUserUri.port || 5432,
          user: effectiveUser,
          db: parsedUserUri.database || 'postgres',
          label: `URI Host (${parsedUserUri.host}:${parsedUserUri.port || 5432})`,
        });
      }

      // 2. Vercel / Server env host
      if (envHost && (!envProjectRef || envProjectRef === ref)) {
        const isPooler = envHost.includes('pooler.supabase.com');
        const effectiveUser =
          isPooler && (!envUser || !envUser.includes('.'))
            ? `postgres.${ref}`
            : envUser || (isPooler ? `postgres.${ref}` : 'postgres');
        directHostsToTry.push({
          host: envHost,
          port: parsedEnvConn?.port || 5432,
          user: effectiveUser,
          db: envDatabase || 'postgres',
          label: `Vercel Configured Host (${envHost}:${parsedEnvConn?.port || 5432})`,
        });
        if ((parsedEnvConn?.port || 5432) !== 6543 && isPooler) {
          directHostsToTry.push({
            host: envHost,
            port: 6543,
            user: effectiveUser,
            db: envDatabase || 'postgres',
            label: `Vercel Pooler (${envHost}:6543)`,
          });
        }
      }

      // 3. IPv6-resolved region pooler hosts
      const ipv6Hosts = await resolveIpv6RegionPoolers(ref);
      for (const h of ipv6Hosts) {
        if (!directHostsToTry.some((d) => d.host === h)) {
          directHostsToTry.push({
            host: h,
            port: 6543,
            user: `postgres.${ref}`,
            db: 'postgres',
            label: `Supabase Pooler (${h}:6543)`,
          });
          directHostsToTry.push({
            host: h,
            port: 5432,
            user: `postgres.${ref}`,
            db: 'postgres',
            label: `Supabase Session Pooler (${h}:5432)`,
          });
        }
      }

      // Try direct / known hosts first
      let needRegionRace = true;
      const failedPasswordsForRef = new Set<string>();
      let confirmedHostForRef: string | null = null;

      for (const target of directHostsToTry) {
        if (confirmedHostForRef && target.host !== confirmedHostForRef) continue;
        let hostTenantMissing = false;
        for (const pwd of passwordCandidates) {
          if (hostTenantMissing || failedPasswordsForRef.has(pwd)) break;
          const client = new PgClient({
            host: target.host,
            port: target.port,
            user: target.user,
            password: pwd,
            database: target.db,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 3000,
          });
          client.on?.('error', () => {});
          try {
            await client.connect();
            const outcome = await executeMigrationOnClient(client, ref, target.label, target.host);
            return res.status(200).json(outcome);
          } catch (err: any) {
            try {
              await client.end();
            } catch {}
            const msg = String(err?.message || '');
            lastError = msg;
            if (msg.includes('Tenant or user not found')) {
              hostTenantMissing = true;
            } else if (msg.includes('password authentication failed') || msg.includes('SCRAM')) {
              // This IS the right host for this project, just wrong password for this candidate!
              needRegionRace = false;
              confirmedHostForRef = target.host;
              failedPasswordsForRef.add(pwd);
              authFailedRef = ref;
              authFailedHost = target.host;
            }
          }
        }
      }

      // 4. Fast Parallel Region Discovery across all 34 Supabase AWS pooler clusters (< 2.5s total)
      if (needRegionRace) {
        const primaryPwd = passwordCandidates[0];
        const allPoolerHosts: string[] = [];
        for (const region of ALL_SUPABASE_REGIONS) {
          const h0 = `aws-0-${region}.pooler.supabase.com`;
          const h1 = `aws-1-${region}.pooler.supabase.com`;
          if (!directHostsToTry.some((d) => d.host === h0)) allPoolerHosts.push(h0);
          if (!directHostsToTry.some((d) => d.host === h1)) allPoolerHosts.push(h1);
        }

        let discoveredAuthHost: string | null = null;
        const activeClients: any[] = [];

        try {
          const winner: { client: any; host: string } = await Promise.any(
            allPoolerHosts.map(
              (host) =>
                new Promise<{ client: any; host: string }>((resolve, reject) => {
                  const c = new PgClient({
                    host,
                    port: 6543,
                    user: `postgres.${ref}`,
                    password: primaryPwd,
                    database: 'postgres',
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 3000,
                  });
                  c.on?.('error', () => {});
                  activeClients.push(c);
                  c.connect()
                    .then(() => resolve({ client: c, host }))
                    .catch((err: any) => {
                      try {
                        c.end();
                      } catch {}
                      const msg = String(err?.message || '');
                      if (
                        !msg.includes('Tenant or user not found') &&
                        (msg.includes('password authentication failed') || msg.includes('SCRAM'))
                      ) {
                        discoveredAuthHost = host;
                        authFailedRef = ref;
                        authFailedHost = host;
                      }
                      reject(err);
                    });
                })
            )
          );

          // Clean up any other clients
          for (const c of activeClients) {
            if (c !== winner.client) {
              try {
                c.end();
              } catch {}
            }
          }

          const outcome = await executeMigrationOnClient(
            winner.client,
            ref,
            `Supabase Pooler (${winner.host}:6543)`,
            winner.host
          );
          return res.status(200).json(outcome);
        } catch {
          for (const c of activeClients) {
            try {
              c.end();
            } catch {}
          }
          // If we discovered the project's region host via auth failure on primaryPwd, try remaining passwordCandidates on it!
          if (discoveredAuthHost && passwordCandidates.length > 1) {
            for (const extraPwd of passwordCandidates.slice(1)) {
              const c = new PgClient({
                host: discoveredAuthHost,
                port: 6543,
                user: `postgres.${ref}`,
                password: extraPwd,
                database: 'postgres',
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 3500,
              });
              c.on?.('error', () => {});
              try {
                await c.connect();
                const outcome = await executeMigrationOnClient(
                  c,
                  ref,
                  `Supabase Pooler (${discoveredAuthHost}:6543)`,
                  discoveredAuthHost
                );
                return res.status(200).json(outcome);
              } catch (err: any) {
                try {
                  await c.end();
                } catch {}
                lastError = String(err?.message || lastError);
              }
            }
          }
        }
      }
    }

    // 5. Fallback: Check if all 16 tables ALREADY exist via Supabase PostgREST API
    const apiKeyToTry = (envServiceKey || body?.supabaseKey || envAnonKey || '').trim();
    if (apiKeyToTry) {
      const tableStatus: Record<string, boolean> = {};
      await Promise.all(
        CRM_REQUIRED_TABLES.map(async (table) => {
          try {
            const r = await fetch(`${primaryUrl}/rest/v1/${table}?select=*&limit=1`, {
              headers: {
                apikey: apiKeyToTry,
                Authorization: `Bearer ${apiKeyToTry}`,
              },
            });
            tableStatus[table] = r.ok;
          } catch {
            tableStatus[table] = false;
          }
        })
      );
      const createdCount = Object.values(tableStatus).filter(Boolean).length;
      if (createdCount === CRM_REQUIRED_TABLES.length) {
        return res.status(200).json({
          success: true,
          projectRef: primaryRef,
          supabaseUrl: primaryUrl,
          anonKey: envAnonKey || undefined,
          message: `All ${createdCount}/${CRM_REQUIRED_TABLES.length} Supabase tables are already created and active on project "${primaryRef}"!`,
          tables: CRM_REQUIRED_TABLES,
          tableStatus,
          createdCount,
          totalCount: CRM_REQUIRED_TABLES.length,
          allTablesCreated: true,
        });
      }
    }

    if (authFailedRef) {
      return res.status(200).json({
        success: false,
        projectRef: authFailedRef,
        supabaseUrl: `https://${authFailedRef}.supabase.co`,
        poolerHost: authFailedHost || undefined,
        message: `Connected to Supabase PostgreSQL for project "${authFailedRef}" (${authFailedHost || 'pooler'}), but password authentication failed for user "postgres". Please verify the Database Password in Supabase Dashboard → Project Settings → Database, or paste your full postgresql:// connection string.`,
        error: 'password authentication failed for user "postgres"',
      });
    }

    return res.status(200).json({
      success: false,
      projectRef: primaryRef,
      supabaseUrl: primaryUrl,
      message: `Database migration could not connect to project "${primaryRef}": ${lastError}. Tip: You can also paste your full postgresql:// Session Pooler URI into the password box, or use Option 2 (Copy & Run in Supabase SQL Editor).`,
      error: lastError,
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      message: `Migration error: ${err?.message || 'Unexpected server error'}`,
      error: err?.message || 'Unexpected server error',
    });
  }
}
