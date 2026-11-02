// Self-contained Vercel Serverless Function & Express handler for /api/supabase-config
// Exposes public Supabase connection parameters (URL & Anon Key) from environment variables.

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const envSupabaseUrl = (
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      ''
    ).trim();

    const envAnonKey = (
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    if (!envSupabaseUrl || !envAnonKey) {
      return res.status(200).json({
        success: false,
        configured: false,
        message: 'Supabase credentials are not set in environment variables.',
        url: '',
        anonKey: '',
      });
    }

    return res.status(200).json({
      success: true,
      configured: true,
      url: envSupabaseUrl,
      anonKey: envAnonKey,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      configured: false,
      error: err?.message || 'Failed to read Supabase configuration.',
    });
  }
}
