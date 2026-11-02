# DAVIZ Solutions CRM — UAE Sales Command Centre & Enterprise ERP

An enterprise-grade, role-based CRM and sales operations platform engineered for **DAVIZ Solutions** (Dubai, UAE), specialized in Power BI consulting, enterprise analytics, and reporting automation.

---

## 🏛️ System Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS (Navy Executive Theme, SweetAlert feedback modals, 360° record drawer, top loading progress bar)
- **Backend & Serverless**: Vercel Serverless Functions (`/api/*`) & Node.js Express server (`server.ts`)
- **Primary Database**: Supabase PostgreSQL with 16 normalized relational tables, automated monthly sequential IDs (`LEA-YY-MM-XXXX`, `VIS-YY-MM-XXXX`, `PLN-YY-MM-XXXX`), and Row Level Security (RLS)
- **Localization**: Native `Asia/Dubai` timezone (UTC+4), AED (د.إ) currency formatting, UAE phone normalization (`+971`), and WhatsApp one-click dispatch
- **Email Verification**: Google Apps Script (Gmail API) integration with HMAC-SHA256 signature verification, 10-minute code expiry, and single-use enforcement
- **Containerization**: Multi-stage production `Dockerfile` with non-root security privileges and integrated healthcheck

---

## 🚀 Deployment Guide

### Option 1: Deploy to Vercel (Recommended)

1. **Push to GitHub**:
   Ensure this repository is pushed to your GitHub account (`orugantirohith`).

2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new) and select this repository.
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install` (or leave default; `.npmrc` automatically includes `--legacy-peer-deps`)

3. **Configure Environment Variables in Vercel**:
   Navigate to **Project Settings > Environment Variables** and add:

   | Variable Name | Description | Example |
   |---|---|---|
   | `VITE_SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | Supabase Anon Public Key | `eyJhbGciOiJIUzI1Ni...` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGciOiJIUzI1Ni...` |
   | `GOOGLE_APPS_SCRIPT_URL` | Deployed Web App URL for OTP | `https://script.google.com/macros/s/.../exec` |
   | `GOOGLE_APPS_SCRIPT_SHARED_SECRET` | HMAC Secret for OTP verification | `64-character-hex-secret` |
   | `CRM_HMAC_SECRET` | Same HMAC Secret for Apps Script | `64-character-hex-secret` |
   | `VITE_COMPANY_NAME` | Organization Name | `DAVIZ Solutions` |
   | `VITE_DEFAULT_TIMEZONE` | Business Timezone | `Asia/Dubai` |
   | `VITE_DEFAULT_CURRENCY` | Primary Currency | `AED` |

4. **Deploy**:
   Click **Deploy**. Vercel will build the frontend and serve both the static SPA and the `/api` serverless functions seamlessly.

---

### Option 2: Deploy with Docker & Docker Compose

For on-premises or cloud VPS deployments (e.g., AWS EC2, DigitalOcean, Hetzner, GCP):

```bash
# 1. Clone repository
git clone https://github.com/orugantirohith/CRM-for-Daviz-Solutions.git
cd CRM-for-Daviz-Solutions

# 2. Configure environment
cp .env.example .env
# Edit .env with your production keys:
nano .env

# 3. Build and run container
docker-compose up -d --build

# 4. Verify status and logs
docker-compose ps
docker-compose logs -f daviz-crm
```

The container includes:
- Non-root user execution (`nodejs` UID 1001)
- Built-in healthcheck (`curl -f http://localhost:3000/`)
- Automatic restart policy (`unless-stopped`)

---

## 🔐 Zero-Secret Policy

This codebase follows strict enterprise security standards:
- **No hardcoded credentials, project references, or API keys** exist anywhere in source code or git history.
- The client application dynamically resolves Supabase credentials at runtime from `/api/supabase-config` if not supplied at build time.
- All secrets are injected strictly via environment variables or `.env` files (which are ignored in `.gitignore`).

---

## 🗄️ Database Setup & Migrations

All 16 operational tables, enum constraints, foreign keys, and indexes are defined in:
- `supabase/migrations/`
- SQL can also be reviewed at `/api/migration-sql` or run directly in Supabase SQL Editor.

### Table Schema Summary
1. `roles`: Enterprise RBAC (Admin, Sales Manager, Sales Rep, Viewer)
2. `profiles`: Enterprise users with email verification status, phone, and role references
3. `modules`: System feature modules
4. `role_permissions`: Granular View/Create/Edit/Delete/Export permissions
5. `companies`: Verified corporate accounts with normalized duplicate detection
6. `leads`: Sales leads with sequential ID `LEA-YY-MM-XXXX`, status, deal value in AED
7. `lead_phones`: Multiple phone contacts per lead
8. `lead_emails`: Multiple email contacts per lead
9. `lead_notes`: Activity and follow-up notes
10. `lead_status_history`: Immutable status transitions with mandatory change reasons
11. `visits`: Physical on-site client visits across UAE with separate appointment vs outcome tracking
12. `plans`: Daily sales plans and manager reviews
13. `follow_ups`: Scheduled follow-ups with priority and reminders
14. `tasks`: Action items linked to leads and accounts
15. `calendar_events`: `Asia/Dubai` time-locked appointments with @mentions
16. `activity_logs`: Audit trail for compliance and tracking

---

## 📧 Google Apps Script OTP Setup

1. Open [Google Apps Script](https://script.google.com).
2. Create a new project and paste the contents of `google-apps-script/Code.gs`.
3. Go to **Project Settings > Script Properties** and add:
   - `CRM_HMAC_SECRET`: (Same random 64-char hex string set in your CRM environment)
4. Click **Deploy > New deployment**:
   - Select type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the deployment URL into `GOOGLE_APPS_SCRIPT_URL` in your `.env` or Vercel dashboard.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start local development server (frontend + local API proxy)
npm run dev

# Run test suite
npx --yes tsx --test src/lib/logic.test.ts

# Production build
npm run build
```

---

## 📄 License
Proprietary & Confidential — **DAVIZ Solutions**, Dubai, United Arab Emirates.
