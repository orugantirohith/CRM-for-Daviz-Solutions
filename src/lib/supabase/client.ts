import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedClientKey = '';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' &&
      (process.env?.VITE_SUPABASE_URL ||
        process.env?.NEXT_PUBLIC_SUPABASE_URL ||
        process.env?.SUPABASE_URL)) ||
    '';

  const envAnonKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' &&
      (process.env?.VITE_SUPABASE_ANON_KEY ||
        process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env?.SUPABASE_ANON_KEY)) ||
    '';

  const localUrl =
    (typeof localStorage !== 'undefined' && localStorage.getItem('daviz_supabase_url')) || '';
  const localAnonKey =
    (typeof localStorage !== 'undefined' && localStorage.getItem('daviz_supabase_anon_key')) || '';

  const validEnvUrl =
    envUrl && !envUrl.includes('your-project') && !envUrl.includes('placeholder') ? envUrl : '';
  const validEnvKey =
    envAnonKey && !envAnonKey.includes('your-anon') && !envAnonKey.includes('placeholder')
      ? envAnonKey
      : '';

  const url = (localUrl || validEnvUrl || '').trim();
  const anonKey = (localAnonKey || validEnvKey || '').trim();

  return { url, anonKey };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof localStorage === 'undefined') return;
  if (url && url.trim()) {
    localStorage.setItem('daviz_supabase_url', url.trim());
  }
  if (anonKey && anonKey.trim()) {
    localStorage.setItem('daviz_supabase_anon_key', anonKey.trim());
  }
  cachedClient = null;
  cachedClientKey = '';
}

export function clearSupabaseCredentials(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('daviz_supabase_url');
  localStorage.removeItem('daviz_supabase_anon_key');
  cachedClient = null;
  cachedClientKey = '';
}

export function isLiveSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url &&
      anonKey &&
      url.startsWith('https://') &&
      !url.includes('placeholder') &&
      !url.includes('your-project')
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (isLiveSupabaseConfigured()) {
    const cacheKey = `${url}::${anonKey}`;
    if (cachedClient && cachedClientKey === cacheKey) {
      return cachedClient;
    }
    try {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      cachedClientKey = cacheKey;
      return cachedClient;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return null;
}

/**
 * Queries /api/supabase-config on startup so that if Supabase is connected via
 * Vercel runtime environment variables, the browser immediately receives its URL and anon key.
 */
export async function syncSupabaseConfigFromServer(): Promise<SupabaseClient | null> {
  if (typeof window === 'undefined') return getSupabaseClient();
  try {
    const current = getSupabaseCredentials();
    if (current.url && current.anonKey) {
      return getSupabaseClient();
    }

    const res = await fetch('/api/supabase-config');
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.url && data?.anonKey) {
        saveSupabaseCredentials(data.url, data.anonKey);
      }
    }
  } catch (err) {
    console.warn('Could not sync Supabase config from server:', err);
  }
  return getSupabaseClient();
}

export const supabase: SupabaseClient | null = getSupabaseClient();
