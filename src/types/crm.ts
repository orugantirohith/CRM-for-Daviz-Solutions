/**
 * DAVIZ Solutions CRM - Core Domain Types
 * Based in UAE (Asia/Dubai timezone, AED currency)
 */

export type RoleType = 'admin' | 'sales_manager' | 'sales_agent' | string;

export interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export type ModuleKey =
  | 'dashboard'
  | 'pipeline'
  | 'leads'
  | 'companies'
  | 'visits'
  | 'plans'
  | 'follow_ups'
  | 'tasks'
  | 'calendar'
  | 'user_management'
  | 'roles_permissions'
  | 'activity_logs'
  | 'settings'
  | 'my_account'
  | 'archive';

export type ActionPermission = 'view' | 'create' | 'edit' | 'delete' | 'export';
export type RecordScope = 'own' | 'team' | 'all';

export interface RolePermission {
  id: string;
  role_id: string;
  module_key: ModuleKey;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  record_scope: RecordScope;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  email_verified: boolean;
  email_verified_at?: string | null;
  phone?: string;
  avatar_url?: string;
  role_id: string;
  role_name?: string;
  manager_id?: string | null;
  team_id?: string | null;
  account_status: 'active' | 'inactive' | 'suspended' | 'invited';
  profile_completed: boolean;
  profile_completed_at?: string | null;
  must_change_password?: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MultiPhone {
  id: string;
  phone_number: string;
  label?: string; // 'Direct', 'Mobile', 'WhatsApp', 'Office'
  is_primary: boolean;
}

export interface MultiEmail {
  id: string;
  email: string;
  label?: string; // 'Work', 'Personal', 'Executive'
  is_primary: boolean;
}

export interface Company {
  id: string;
  company_code: string; // e.g. CP-26-10-0001
  name: string;
  normalized_name: string;
  industry: string;
  website?: string;
  linkedin_url?: string;
  general_phone?: string;
  general_email?: string;
  country: string;
  emirate_state: string;
  city: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  size_band?: string; // '1-10', '11-50', '51-200', '201-500', '500+'
  description?: string;
  source?: string;
  assigned_to?: string; // User ID
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  lead_count?: number;
}

export type LeadStatus =
  | 'New'
  | 'Connected'
  | 'Qualified'
  | 'Meeting'
  | 'Proposal Sent'
  | 'Won'
  | 'Lost'
  | 'Follow-up Required';

export interface Lead {
  id: string;
  lead_code: string; // LD-YY-MM-NNNN (e.g. LD-26-10-0001)
  company_id: string;
  company_name: string;
  contact_name: string;
  job_title: string;
  industry: string;
  website?: string;
  linkedin_url?: string;
  whatsapp_number?: string;
  phones: MultiPhone[];
  emails: MultiEmail[];
  country: string;
  emirate_state: string;
  city: string;
  area?: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  lead_source: string;
  status: LeadStatus;
  assigned_to: string; // user ID
  assigned_user_name?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  details?: string; // Lead DTLs / Project & Client Requirements
  estimated_value?: number;
  last_contacted_at?: string | null;
  next_follow_up_at?: string | null;
  created_by: string;
  created_by_name?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  author_name: string;
  author_role?: string;
  note_text: string;
  visibility_scope: 'team' | 'private' | 'manager_only';
  created_at: string;
  related_activity_id?: string;
}

export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  previous_status: LeadStatus;
  new_status: LeadStatus;
  note: string; // Mandatory on status change
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
}

export type VisitStatus = 'Planned' | 'Completed' | 'Rescheduled' | 'Cancelled' | 'No Show';

export type VisitOutcome =
  | 'Positive'
  | 'Neutral'
  | 'Negative'
  | 'Needs Follow-up'
  | 'Opportunity Identified'
  | 'Not Interested'
  | 'Other';

export interface Visit {
  id: string;
  visit_code: string; // VS-YY-MM-NNNN (e.g. VS-26-10-0001)
  lead_id: string;
  lead_code?: string;
  company_id: string;
  company_name: string;
  contact_id?: string;
  contact_name: string;
  visit_date: string; // YYYY-MM-DD
  start_at: string; // ISO string
  end_at: string; // ISO string
  assigned_to: string; // User ID
  assigned_user_name?: string;
  location: string;
  status: VisitStatus;
  outcome?: VisitOutcome;
  discussion_summary: string;
  client_requirements?: string;
  services_discussed?: string[];
  objections?: string;
  client_response?: string;
  decision_maker_present: boolean;
  next_steps?: string;
  follow_up_required: boolean;
  next_follow_up_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export type PlanStatus =
  | 'Draft'
  | 'Submitted'
  | 'Approved'
  | 'Changes Requested'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export interface Plan {
  id: string;
  plan_code: string; // PL-YY-MM-NNNN
  owner_id: string;
  owner_name?: string;
  plan_date: string; // YYYY-MM-DD
  title: string;
  description: string;
  activity_type: 'Visit' | 'Call' | 'Meeting' | 'Follow-up' | 'Prospecting' | 'Demo' | 'Other';
  start_at: string;
  end_at: string;
  lead_id?: string;
  company_id?: string;
  visit_id?: string;
  company_name?: string;
  location?: string;
  priority: 'low' | 'medium' | 'high';
  status: PlanStatus;
  manager_comment?: string;
  approved_by?: string;
  approved_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlanHistory {
  id: string;
  plan_id: string;
  changed_by: string;
  changed_by_name: string;
  change_summary: string;
  before_data: Partial<Plan>;
  after_data: Partial<Plan>;
  created_at: string;
}

export type FollowUpStatus = 'Pending' | 'Completed' | 'Rescheduled' | 'Cancelled' | 'Overdue';

export interface FollowUp {
  id: string;
  follow_up_code: string; // FU-YY-MM-NNNN
  lead_id: string;
  company_id: string;
  company_name: string;
  contact_name: string;
  assigned_to: string;
  assigned_user_name?: string;
  due_at: string; // ISO
  channel: 'Call' | 'Email' | 'WhatsApp' | 'Meeting' | 'Visit' | 'Other';
  objective: string;
  status: FollowUpStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  outcome_note?: string;
  completed_at?: string | null;
  completed_by?: string | null;
  next_follow_up_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Blocked' | 'Completed' | 'Cancelled';

export interface Task {
  id: string;
  task_code: string; // TK-YY-MM-NNNN
  title: string;
  description: string;
  assigned_to: string;
  assigned_user_name?: string;
  created_by: string;
  created_by_name?: string;
  start_at?: string | null;
  due_at: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  related_entity_type?: 'lead' | 'company' | 'visit' | 'plan';
  related_entity_id?: string;
  related_title?: string;
  completion_note?: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'Meeting' | 'Visit' | 'Call' | 'Follow-up' | 'Demo' | 'Internal';
  start_at: string; // ISO
  end_at: string; // ISO
  timezone: string; // Asia/Dubai
  created_by: string;
  assigned_to: string;
  company_id?: string;
  company_name?: string;
  lead_id?: string;
  visit_id?: string;
  location?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  reminder_at?: string | null;
  attendees: Array<{ user_id: string; display_name: string; email?: string }>;
  created_at: string;
  updated_at: string;
}

export interface ScheduledMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_type: 'direct' | 'group' | 'all';
  recipient_id?: string; // target user ID or group ID
  recipient_label: string;
  content: string;
  scheduled_for: string; // ISO string in Asia/Dubai
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed';
  created_at: string;
  delivered_at?: string | null;
  linked_calendar_event_id?: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  mentions: string[]; // user IDs
  created_at: string;
  is_system?: boolean;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  sender_id?: string;
  sender_name?: string;
  type:
    | 'mention'
    | 'assignment'
    | 'plan_changed'
    | 'scheduled_message'
    | 'calendar_reminder'
    | 'status_alert';
  title: string;
  message: string;
  related_module?: ModuleKey;
  related_id?: string;
  created_at: string;
  read_at?: string | null;
  status: 'unread' | 'read';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'STATUS_CHANGE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'PERMISSION_CHANGE'
    | 'EXPORT'
    | 'ARCHIVE'
    | 'RESTORE'
    | 'MESSAGE_SCHEDULED'
    | 'MESSAGE_SENT';
  module: ModuleKey | 'auth';
  record_id?: string;
  result: 'Success' | 'Failure' | 'Denied';
  description: string;
  details?: Record<string, unknown>;
}

export interface ArchiveRecord {
  id: string;
  archive_id: string; // ARC-YY-MM-NNNN
  entity_type: 'leads' | 'companies' | 'visits' | 'tasks';
  original_record_id: string;
  original_record_code: string;
  sheet_name: string;
  sheet_row_reference?: string;
  payload_hash: string;
  payload_json: Record<string, unknown>;
  status: 'archived' | 'restored' | 'failed';
  archived_at: string;
  restored_at?: string | null;
  created_by: string;
}
