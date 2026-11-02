import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const resolvedSupabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const resolvedSupabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const rawGasUrl =
    env.GOOGLE_APPS_SCRIPT_URL ||
    env.VITE_GOOGLE_APPS_SCRIPT_URL ||
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    '';
  const resolvedGasUrl = rawGasUrl ? rawGasUrl.replace(/\/macros\/u\/\d+\//i, '/macros/') : '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(resolvedSupabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(resolvedSupabaseAnonKey),
      'import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL': JSON.stringify(resolvedGasUrl),
      'import.meta.env.GOOGLE_APPS_SCRIPT_URL': JSON.stringify(resolvedGasUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(currentDir, '.'),
        '@supabase/phoenix': path.resolve(currentDir, 'node_modules/@supabase/phoenix/assets/js/phoenix/index.js'),
      },
    },
    optimizeDeps: {
      include: ['@supabase/supabase-js', '@supabase/phoenix'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
