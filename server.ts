import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import runMigrationHandler from './api/run-migration';
import supabaseStatusHandler from './api/supabase-status';
import supabaseConfigHandler from './api/supabase-config';
import migrationSqlHandler from './api/migration-sql';

import sendOtpHandler from './api/send-otp';
import verifyOtpHandler from './api/verify-otp';
import completeProfileHandler from './api/complete-profile';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // Delegate all /api/* endpoints directly to the self-contained Vercel Serverless handlers
  app.all('/api/supabase-config', (req, res) => supabaseConfigHandler(req, res));
  app.all('/api/supabase-status', (req, res) => supabaseStatusHandler(req, res));
  app.all('/api/migration-sql', (req, res) => migrationSqlHandler(req, res));
  app.all('/api/run-migration', (req, res) => runMigrationHandler(req, res));
  app.all('/api/send-otp', (req, res) => sendOtpHandler(req, res));
  app.all('/api/verify-otp', (req, res) => verifyOtpHandler(req, res));
  app.all('/api/complete-profile', (req, res) => completeProfileHandler(req, res));

  // Ensure any unknown /api/* route always returns JSON, never HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // In development, mount Vite's connect middleware; in production, serve static dist/
  const distPath = path.resolve(__dirname, 'dist');
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DAVIZ CRM Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
