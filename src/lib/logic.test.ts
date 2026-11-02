import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRecordId, isValidRecordId, parseRecordId } from './ids/idGenerator';
import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from './permissions/permissionCheck';
import { isValidOtpFormat, checkOtpExpiry, validateOtpAttempt, OTP_CONFIG } from './validation/otpRules';
import { formatAED, formatWhatsAppLink, getDubaiYearMonth } from './dates/dubaiDate';

test('ID Generator: formats monthly sequence ID correctly (e.g. LD-26-10-0001)', () => {
  const leadId = formatRecordId('LD', 2026, 10, 1);
  assert.equal(leadId, 'LD-26-10-0001');

  const visitId = formatRecordId('VS', 2026, 10, 42);
  assert.equal(visitId, 'VS-26-10-0042');

  const companyId = formatRecordId('CP', 2026, 10, 9999);
  assert.equal(companyId, 'CP-26-10-9999');

  assert.equal(isValidRecordId(leadId), true);
  assert.equal(isValidRecordId('INVALID_ID'), false);

  const parsed = parseRecordId(leadId);
  assert.deepEqual(parsed, { prefix: 'LD', year: 2026, month: 10, sequence: 1 });
});

test('Permissions: Admin has full access to all modules and scopes', () => {
  const adminCtx = { userId: 'admin-1', roleId: 'admin' };
  assert.equal(hasPermission('user_management', 'view', adminCtx), true);
  assert.equal(hasPermission('leads', 'delete', adminCtx), true);
  assert.equal(hasPermission('roles_permissions', 'edit', adminCtx), true);
  assert.equal(hasPermission('archive', 'export', adminCtx), true);
});

test('Permissions: Sales Agent cannot access user_management or roles_permissions', () => {
  const agentCtx = { userId: 'agent-1', roleId: 'sales_agent' };
  assert.equal(hasPermission('user_management', 'view', agentCtx), false);
  assert.equal(hasPermission('roles_permissions', 'edit', agentCtx), false);
  assert.equal(hasPermission('settings', 'view', agentCtx), false);
});

test('Permissions: Sales Agent cannot view another agent record when record_scope is own', () => {
  const agentCtx = { userId: 'agent-1', roleId: 'sales_agent', recordOwnerId: 'agent-2' };
  assert.equal(hasPermission('leads', 'view', agentCtx), false);

  const ownCtx = { userId: 'agent-1', roleId: 'sales_agent', recordOwnerId: 'agent-1' };
  assert.equal(hasPermission('leads', 'view', ownCtx), true);
});

test('Permissions: Sales Manager can view team leads and export', () => {
  const managerCtx = { userId: 'mgr-1', roleId: 'sales_manager', recordOwnerId: 'agent-2' };
  assert.equal(hasPermission('leads', 'view', managerCtx), true);
  assert.equal(hasPermission('leads', 'export', managerCtx), true);
  // Manager cannot delete leads by default
  assert.equal(hasPermission('leads', 'delete', managerCtx), false);
  // Manager cannot edit settings by default
  assert.equal(hasPermission('settings', 'edit', managerCtx), false);
});

test('OTP Rules: enforces 6-digit numeric format and expiration', () => {
  assert.equal(isValidOtpFormat('123456'), true);
  assert.equal(isValidOtpFormat('12345'), false);
  assert.equal(isValidOtpFormat('12345a'), false);

  const now = Date.now();
  assert.equal(checkOtpExpiry(now - 5 * 60 * 1000, now), true); // 5 mins ago -> valid
  assert.equal(checkOtpExpiry(now - 11 * 60 * 1000, now), false); // 11 mins ago -> expired

  // Attempt validation
  const validAttempt = validateOtpAttempt('123456', 'agent@daviz.ae', {
    attempts: 1,
    createdAtMs: now - 60000,
    isVerified: false,
  });
  assert.equal(validAttempt.valid, true);

  const exceededAttempt = validateOtpAttempt('123456', 'agent@daviz.ae', {
    attempts: 5,
    createdAtMs: now - 60000,
    isVerified: false,
  });
  assert.equal(exceededAttempt.valid, false);
});

test('Regional & Currency: formats AED and UAE WhatsApp links correctly', () => {
  assert.equal(formatAED(15000), 'AED 15,000');
  assert.equal(formatAED(0), 'AED 0');

  // WhatsApp conversion
  const wa = formatWhatsAppLink('+971 50 123 4567');
  assert.equal(wa, 'https://wa.me/971501234567');

  const waLocal = formatWhatsAppLink('0501234567');
  assert.equal(waLocal, 'https://wa.me/971501234567');
});

test('Business Rule: Mandatory note on status change rejects empty notes', () => {
  const validateStatusChange = (newStatus: string, note: string) => {
    if (!note || note.trim().length === 0) {
      throw new Error('A non-empty progress note is mandatory when changing a lead status.');
    }
    return { success: true, newStatus, note: note.trim() };
  };

  assert.throws(() => validateStatusChange('Connected', ''), /mandatory/);
  assert.throws(() => validateStatusChange('Qualified', '   '), /mandatory/);
  const ok = validateStatusChange('Meeting', 'Scoping workshop scheduled');
  assert.equal(ok.success, true);
  assert.equal(ok.note, 'Scoping workshop scheduled');
});

test('Vercel Serverless Endpoints: self-contained with zero top-level static imports and return valid JSON', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const apiFiles = ['run-migration.ts', 'supabase-status.ts', 'supabase-config.ts', 'migration-sql.ts'];

  for (const file of apiFiles) {
    const content = fs.readFileSync(path.resolve(process.cwd(), 'api', file), 'utf-8');
    const hasTopLevelStaticImport = /^import\s+.*from\s+['"]/m.test(content);
    assert.equal(
      hasTopLevelStaticImport,
      false,
      `api/${file} must not contain top-level static imports that break Node ESM on Vercel`
    );
  }

  const { default: runMigrationHandler } = await import('../../api/run-migration');
  let statusCode = 0;
  let jsonPayload: any = null;
  const mockRes = {
    setHeader: () => {},
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      jsonPayload = data;
      return this;
    },
    end() {
      return this;
    },
  };

  await runMigrationHandler({ method: 'POST', body: { dbPassword: '' } }, mockRes);
  assert.equal(statusCode, 200);
  assert.equal(typeof jsonPayload, 'object');
  assert.equal(typeof jsonPayload.message, 'string');
});

test('Supabase PostgreSQL UUIDs: generates valid RFC-4122 UUIDs and validates admin profile UUID', async () => {
  const { generateUuid, isUuid } = await import('../services/crmService');
  const { DEFAULT_ADMIN_UUID, SEED_USERS } = await import('./supabase/mockData');

  const id1 = generateUuid();
  const id2 = generateUuid();
  assert.equal(isUuid(id1), true);
  assert.equal(isUuid(id2), true);
  assert.notEqual(id1, id2);
  assert.equal(isUuid('ld-12345'), false);
  assert.equal(isUuid('usr-admin-1'), false);
  assert.equal(isUuid(DEFAULT_ADMIN_UUID), true);
  assert.equal(SEED_USERS[0].id, DEFAULT_ADMIN_UUID);
});

test('CRM Service: leads created by admin are visible when sales agent views all leads', async () => {
  const { crmService } = await import('../services/crmService');
  
  // 1. Admin creates a lead
  const createdLead = crmService.createLead({
    company_name: 'Al Futtaim Logistics',
    company_id: '',
    created_by: crmService.getCurrentUser().id,
    contact_name: 'Tariq Mansour',
    job_title: 'Operations Director',
    industry: 'Logistics & Supply Chain',
    status: 'New',
    priority: 'high',
    assigned_to: crmService.getCurrentUser().id,
    address: 'Dubai South, UAE',
    city: 'Dubai',
    country: 'United Arab Emirates',
    emirate_state: 'Dubai',
    lead_source: 'Direct',
    phones: [{ id: '1', phone_number: '+971501234567', label: 'Mobile', is_primary: true }],
    emails: [{ id: '1', email: 'tariq@alfuttaim.ae', label: 'Work', is_primary: true }],
  });
  assert.equal(typeof createdLead.id, 'string');

  // 2. Simulate switching to user "you" with role sales_agent
  const users = crmService.getUsers();
  let youUser = users.find((u) => u.username === 'you');
  if (!youUser) {
    youUser = crmService.createUser({
      username: 'you',
      display_name: 'You User',
      email: 'you@daviz.ae',
      role_id: 'sales_agent',
    });
  }

  crmService.setCurrentUser(youUser);
  const visibleToYou = crmService.getLeads();
  assert.equal(
    visibleToYou.some((l) => l.id === createdLead.id),
    true,
    'User "you" (sales agent) must see lead created by Admin'
  );

  // 3. Verify filtering by assignedTo specifically works
  const ownLeads = crmService.getLeads({ assignedTo: youUser.id });
  assert.equal(Array.isArray(ownLeads), true);

  // 4. Restore current user to admin
  const admin = users.find((u) => u.role_id === 'admin');
  if (admin) crmService.setCurrentUser(admin);
});

test('OTP Handlers: send-otp and verify-otp endpoints generate and verify valid OTPs', async () => {
  const { default: sendOtpHandler } = await import('../../api/send-otp');
  const { default: verifyOtpHandler } = await import('../../api/verify-otp');

  let sendStatusCode = 0;
  let sendPayload: any = null;
  const mockSendRes = {
    setHeader: () => {},
    status(code: number) {
      sendStatusCode = code;
      return this;
    },
    json(data: any) {
      sendPayload = data;
      return this;
    },
    end() {
      return this;
    },
  };

  await sendOtpHandler(
    { method: 'POST', body: { email: 'agent@daviz.ae', name: 'Test Agent' } },
    mockSendRes
  );

  assert.equal(sendStatusCode, 200);
  assert.equal(sendPayload.success, true);

  const otpCode = sendPayload.devFallbackOtp || '123456';

  let verifyStatusCode = 0;
  let verifyPayload: any = null;
  const mockVerifyRes = {
    setHeader: () => {},
    status(code: number) {
      verifyStatusCode = code;
      return this;
    },
    json(data: any) {
      verifyPayload = data;
      return this;
    },
    end() {
      return this;
    },
  };

  await verifyOtpHandler(
    { method: 'POST', body: { email: 'agent@daviz.ae', otp: otpCode } },
    mockVerifyRes
  );

  assert.equal(verifyStatusCode, 200);
  assert.equal(verifyPayload.success, true);
  assert.equal(verifyPayload.verified, true);
});
