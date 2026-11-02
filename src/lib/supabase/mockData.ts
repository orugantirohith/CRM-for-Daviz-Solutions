/**
 * DAVIZ Solutions CRM - Clean Production Seed Data
 * System roles and initial administrator account with UUID matching Supabase public.profiles.
 */

import {
  ActivityLog,
  CalendarEvent,
  Company,
  FollowUp,
  Lead,
  LeadNote,
  LeadStatusHistory,
  NotificationItem,
  Plan,
  Role,
  ScheduledMessage,
  Task,
  UserProfile,
  Visit,
} from '../../types/crm';

export const DEFAULT_ADMIN_UUID = '85e80e21-c8df-4948-a4f0-52a8872b202a';

export const SEED_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system and company-wide access across all modules, settings, and logs.',
    is_system_role: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'sales_manager',
    name: 'Sales Manager',
    description: 'Team-wide sales pipeline, all leads, notes, visits, plans review, and reports.',
    is_system_role: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'sales_agent',
    name: 'Sales Agent',
    description: 'Assigned leads, visit reports, daily plans, follow-ups, and calendar tasks.',
    is_system_role: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T09:05:00Z',
  },
];

export const SEED_USERS: UserProfile[] = [
  {
    id: DEFAULT_ADMIN_UUID,
    username: 'admin',
    display_name: 'David Vance (Admin)',
    email: 'admin@daviz.ae',
    email_verified: true,
    email_verified_at: '2026-10-01T09:00:00Z',
    phone: '+971 50 111 2233',
    role_id: 'admin',
    role_name: 'Administrator',
    account_status: 'active',
    profile_completed: true,
    profile_completed_at: '2026-10-01T09:05:00Z',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T09:05:00Z',
  },
];

// Completely clean arrays: zero demo records
export const SEED_COMPANIES: Company[] = [];
export const SEED_LEADS: Lead[] = [];
export const SEED_LEAD_NOTES: LeadNote[] = [];
export const SEED_STATUS_HISTORY: LeadStatusHistory[] = [];
export const SEED_VISITS: Visit[] = [];
export const SEED_PLANS: Plan[] = [];
export const SEED_FOLLOW_UPS: FollowUp[] = [];
export const SEED_TASKS: Task[] = [];
export const SEED_CALENDAR_EVENTS: CalendarEvent[] = [];
export const SEED_NOTIFICATIONS: NotificationItem[] = [];
export const SEED_ACTIVITY_LOGS: ActivityLog[] = [];
export const SEED_SCHEDULED_MESSAGES: ScheduledMessage[] = [];
