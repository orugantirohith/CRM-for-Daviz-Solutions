import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    const userId = String(body.userId || '').trim();
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim();
    const displayName = String(body.displayName || '').trim();
    const phone = String(body.phone || '').trim();
    const profileCompleted = body.profile_completed !== false;

    if (!userId && !username) {
      return res.status(400).json({ success: false, error: 'User ID or username is required.' });
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      '';
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      '';

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ success: false, error: 'Supabase service role credentials not configured.' });
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      email_verified: true,
      email_verified_at: nowIso,
      profile_completed: profileCompleted,
      profile_completed_at: profileCompleted ? nowIso : null,
      must_change_password: false,
      updated_at: nowIso,
    };

    if (email) updatePayload.email = email;
    if (displayName) updatePayload.display_name = displayName;
    if (phone) updatePayload.phone = phone;

    // 1. Try update by UUID
    let updated = false;
    if (userId) {
      const { error: idError, data: idData } = await client
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select();

      if (!idError && idData && idData.length > 0) {
        updated = true;
      }
    }

    // 2. If not updated by ID, update by username
    if (!updated && username) {
      const { error: userError, data: userData } = await client
        .from('profiles')
        .update(updatePayload)
        .eq('username', username)
        .select();

      if (!userError && userData && userData.length > 0) {
        updated = true;
      }
    }

    // 3. Fallback: Upsert row if not already present
    if (!updated && (userId || username)) {
      await client.from('profiles').upsert(
        {
          id: userId || undefined,
          username: username,
          ...updatePayload,
        },
        { onConflict: 'username' }
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Profile completed and permanently saved to Supabase.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal error updating profile.',
    });
  }
}
