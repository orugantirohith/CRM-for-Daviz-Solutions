// Self-contained Vercel Serverless Function for /api/supabase-status
// Zero top-level imports so Node.js ESM on Vercel never crashes before handler() executes.

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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const queryUrl = typeof req.query?.url === 'string' ? req.query.url.trim() : '';
    const queryKey = typeof req.query?.key === 'string' ? req.query.key.trim() : '';
    const qRef = extractProjectRef(queryUrl);

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

    const effectiveProjectRef = envProjectRef || qRef || '';
    const url = envSupabaseUrlRaw || (effectiveProjectRef ? `https://${effectiveProjectRef}.supabase.co` : '');
    const key = queryKey || envServiceKey || envAnonKey || '';

    const tableStatus: Record<string, boolean> = {};
    for (const t of CRM_REQUIRED_TABLES) {
      tableStatus[t] = false;
    }

    if (key && url) {
      await Promise.all(
        CRM_REQUIRED_TABLES.map(async (table) => {
          try {
            const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
              headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
              },
            });
            tableStatus[table] = response.ok;
          } catch {
            tableStatus[table] = false;
          }
        })
      );
    }

    if (process.env.RUNTIME_MIGRATED_PROJECT_REF === effectiveProjectRef) {
      for (const t of CRM_REQUIRED_TABLES) {
        tableStatus[t] = true;
      }
    }

    let createdCount = Object.values(tableStatus).filter(Boolean).length;
    const hasEnvDbCredentials = Boolean(envPassword || envConnStrings.length > 0);

    // If PostgREST didn't report all 16 tables and we have Postgres credentials in env, check information_schema
    if (
      createdCount < CRM_REQUIRED_TABLES.length &&
      envPassword &&
      envHost &&
      (!envProjectRef || envProjectRef === effectiveProjectRef)
    ) {
      try {
        const pgMod: any = await import('pg');
        const PgClient = pgMod.Client || pgMod.default?.Client;
        if (PgClient) {
          const isPooler = envHost.includes('pooler.supabase.com');
          const effectiveUser =
            isPooler && (!envUser || !envUser.includes('.'))
              ? `postgres.${effectiveProjectRef}`
              : envUser || (isPooler ? `postgres.${effectiveProjectRef}` : 'postgres');
          const client = new PgClient({
            host: envHost,
            port: parsedEnvConn?.port || 5432,
            user: effectiveUser,
            password: envPassword,
            database: envDatabase || 'postgres',
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 3000,
          });
          client.on?.('error', () => {});
          await client.connect();
          const tableRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
          `);
          await client.end();
          const existingSet = new Set((tableRes.rows || []).map((r: any) => String(r.table_name)));
          for (const reqTable of CRM_REQUIRED_TABLES) {
            if (existingSet.has(reqTable)) {
              tableStatus[reqTable] = true;
            }
          }
          createdCount = Object.values(tableStatus).filter(Boolean).length;
        }
      } catch {
        // ignore direct status check error
      }
    }

    return res.status(200).json({
      configured: Boolean(key || hasEnvDbCredentials || createdCount > 0),
      url,
      anonKey: envAnonKey || undefined,
      projectRef: effectiveProjectRef,
      hasEnvDbCredentials,
      allTablesCreated: createdCount === CRM_REQUIRED_TABLES.length,
      createdCount,
      totalCount: CRM_REQUIRED_TABLES.length,
      tables: tableStatus,
    });
  } catch (err: any) {
    return res.status(200).json({
      configured: false,
      error: err?.message || 'Failed to check Supabase status',
    });
  }
}
