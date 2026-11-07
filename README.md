# Forerunners Network International (FNI) - Digital Reporting System

A production-grade, centralized ministry reporting and governance platform engineered for **Forerunners Network International (FNI)**.

---

## 1. Executive Overview

The **FNI Digital Reporting System** replaces manual and fragmented ministry reporting processes with an institutional, role-based platform. Field cell leaders, regional leaders, national directors, and the global super-administrator can seamlessly submit, verify, review, monitor, and analyze fellowship activities and soul-winning harvests across territories.

### Core Objectives Delivered in Phase 1:
- **Centralized Digital Submissions**: Structured 10-area weekly reporting form replacing manual spreadsheets and messaging apps.
- **Role-Based Access Control (RBAC)**: Strict segregation between Super Administrator, National Administrator, Regional Leader, and Cell Leader.
- **Transparent Review & Audit Trail**: Real-time review workflow (`Draft` → `Submitted` → `Under Review` → `Approved` / `Needs Revision`) with immutable audit logging.
- **Executive Analytics**: Real-time KPI dashboards, weekly attendance/visitor trends, and soul-winning velocity charts using Recharts.
- **Regional Compliance Monitoring**: Automated tracking of compliant vs outstanding cell reports with multi-channel nudge triggers (WhatsApp/Email/In-App).
- **Dual Persistence Architecture**: Direct Supabase PostgreSQL + Row Level Security (RLS) integration with an automatic fallback local store for zero-config evaluation.

---

## 2. Technology Stack & Architecture

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript | Strict typing, modular architecture, reusable components |
| **Build Tool** | Vite 5 | Fast HMR, optimized production build |
| **Styling & Theme** | Tailwind CSS 3.4 | Institutional visual identity: Deep Navy (`#0B1B3D`), Restrained Gold (`#C59B27`), Slate surfaces |
| **Icons & Charts** | Lucide React + Recharts | Responsive SVG charts (attendance, visitors, soul winning) |
| **Backend & Database** | Supabase (PostgreSQL 15+) | Relational tables, foreign keys, triggers, constraints, indexes |
| **Security & Auth** | Supabase Auth + RLS | Row Level Security policies on every table |
| **Hosting Target** | Vercel | Production-ready SPA with route rewrites |

---

## 3. Visual Identity Guidelines

Adheres strictly to an organizational management aesthetic:
- **Primary Background**: White (`#FFFFFF`) and Light Slate (`#F8FAFC`, `#F1F5F9`).
- **Brand Primary**: Deep Navy Blue (`#0B1B3D`, `#071228`).
- **Brand Accent**: Restrained Metallic Gold (`#C59B27`, `#E0B84C`).
- **No Gimmicks**: Avoided excessive gradients, unnecessary animations, and generic AI glassmorphism.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Module / Action | Super Administrator | National Administrator | Regional Leader | Cell Leader |
|---|:---:|:---:|:---:|:---:|
| **Executive Dashboard** | Global Organization | National Scope | Assigned Region Scope | Assigned Cell Scope |
| **Submit Cell Report** | Yes | Yes | — | Yes (Own Cell) |
| **Save Report as Draft** | Yes | Yes | — | Yes |
| **Review & Approve Reports** | All Regions | National Scope | Assigned Region | — |
| **Request Revisions & Feedback** | All Regions | National Scope | Assigned Region | — |
| **Regional Oversight & Directory**| All Regions | All Regions | Assigned Region | — |
| **User & Role Administration** | Full CRUD | Full CRUD | Read-only | — |
| **Register Cells & Regions** | Full CRUD | Full CRUD | Region Cells | — |
| **Configure Reporting Cycles** | Full CRUD | Full CRUD | — | — |
| **Multi-Channel Reminders** | Dispatch Org-wide | Dispatch National | Dispatch Regional | View Notifications |
| **Immutable Audit Logs** | Full Visibility | Full Visibility | — | — |

---

## 5. Authentication, Cell Registration & Administrator Security

The platform implements enterprise-grade authentication with distinct separation between field ministers and national administration:

### A. Cell Leader Sign-In & Onboarding
- **OAuth Providers**: Supabase Authentication with **Google Account (Gmail)** and **Apple ID**.
- **First-Time Registration Wizard**: Non-dismissible modal immediately triggered for newly signed-in cell leaders.
  - Collects Full Name, Cell Fellowship Name, WhatsApp/Phone Number, Region, Meeting Day/Time, Venue Address, Target Attendance.
  - **Duplicate Prevention & Association**: Performs case-insensitive, alphanumeric normalization on cell names. If a cell already exists (e.g. `Grace Cell VI` vs `Grace Cell Victoria Island`), prompts to link to the existing cell without generating duplicate records.
  - Sets `is_onboarded = true` and persists details in Supabase database.
- **Returning Cell Leaders**: Automatically recognized; bypasses onboarding and loads their registered cell data directly.
- **Data Isolation**: Cell leaders are restricted by Row Level Security (RLS) and can only access their own profile, cell details, and reports.

### B. Administrator Access & Hardened Credentials
- **Separate Admin Sign-In**: Dedicated login portal for system and national administrators.
- **Initial Setup Credentials**:
  - Username: `admin`
  - Temporary Password: `admin123`
- **Mandatory First-Login Password Change**:
  - Immediately locks the screen with `ForcePasswordChangeModal`.
  - Administrator cannot skip, dismiss, or bypass this step.
  - Password strength validation: Minimum 8 characters, alphanumeric, cannot equal `admin123`.
  - Disables the temporary `admin123` credentials permanently once configured.
  - Administrator can update their password later via **Account Settings**.
- **Role Elevation Protection**: Ordinary cell leaders registering via OAuth cannot assign themselves administrative privileges.

### C. Administrator Privileges
- **Cell Leaders Directory**: View all registered leaders with full names, phone numbers, and associated cell names.
- **Cell Search & Filtering**: Search cells by name, code, or leader, with region filters.
- **Direct Report Inspection**: One-click preview of weekly returns submitted by each individual cell fellowship.

---

## 6. Database Schema & RLS Architecture

The initial schema migration is stored in `supabase/migrations/20261107_initial_schema.sql`.

### Relational Tables
1. `profiles`: Extends Supabase `auth.users`, storing user role, contact info, region, and cell assignment.
2. `regions`: Ecclesiastical boundaries (e.g., Lagos Central, Abuja Capital, London Diaspora, Accra Hub).
3. `cells`: Fellowship units with leader assignment, meeting schedule, and venue address.
4. `reporting_periods`: Weekly reporting windows with open/closed flags and strict submission deadlines.
5. `cell_reports`: Core 10-area reporting data with auto-calculated total attendance, numerical metrics, and pastoral remarks.
6. `report_reviews`: Reviewer notes, status transitions, and timestamps.
7. `notifications`: Multi-channel alerts (In-App, Email, WhatsApp) for submission confirmations and reminders.
8. `audit_logs`: Immutable audit trail of administrative and review mutations.

### Row Level Security (RLS)
- **Cell Leaders**: Can only view their own cell's reports and insert/update reports for their assigned fellowship unit.
- **Regional Leaders**: Can only view and review reports belonging to cells within their assigned regional jurisdiction.
- **National & Super Admins**: Organization-wide visibility and administrative authority.

---

## 6. Project Directory Structure

```
fni-reporting-system/
├── public/
│   └── logo.svg                     # Official FNI brand vector mark
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminManagementView.tsx  # User, cell, region, period admin
│   │   │   └── AuditTrailView.tsx       # Immutable system audit trail
│   │   ├── auth/
│   │   │   └── AuthView.tsx             # Supabase Auth & role switch evaluator
│   │   ├── common/
│   │   │   ├── Badge.tsx                # Status and role indicator badges
│   │   │   ├── Button.tsx               # Standardized institutional buttons
│   │   │   ├── Card.tsx                 # Consistent surface container
│   │   │   ├── EmptyState.tsx           # Fallback empty states
│   │   │   ├── LoadingSpinner.tsx       # Async operation indicator
│   │   │   └── Modal.tsx                # Accessible backdrop modal dialog
│   │   ├── dashboard/
│   │   │   ├── ComplianceTracker.tsx    # Regional submission compliance bars
│   │   │   ├── DashboardView.tsx        # Role-tailored master dashboard
│   │   │   ├── RecentReportsTable.tsx   # Submissions table with quick review
│   │   │   ├── SoulsWonChart.tsx        # Evangelism harvest trend chart
│   │   │   ├── StatCard.tsx             # Metric KPI summary cards
│   │   │   └── WeeklyPerformanceChart.tsx # Attendance vs visitors dual chart
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx            # App container & tab navigation
│   │   │   ├── Header.tsx               # Breadcrumbs, active cycle, alerts
│   │   │   ├── RoleSwitcherBanner.tsx   # Immediate RBAC evaluator bar
│   │   │   └── Sidebar.tsx              # Responsive navigation drawer
│   │   ├── notifications/
│   │   │   └── NotificationCenterModal.tsx # Multi-channel dispatch hub
│   │   └── reports/
│   │       ├── CellReportForm.tsx       # 10-area structured weekly form
│   │       ├── ReportDetailModal.tsx    # Review sheet, feedback, status update
│   │       └── ReportHistoryTable.tsx   # Search, multi-filter, CSV export
│   ├── context/
│   │   ├── AuthContext.tsx              # Session state, role permissions
│   │   └── NotificationContext.tsx      # In-app alerts, reminder dispatch
│   ├── lib/
│   │   └── supabase.ts                  # Supabase client initialization
│   ├── services/
│   │   ├── analyticsService.ts          # KPI & trend aggregation engine
│   │   ├── authService.ts              # Supabase auth + local storage fallback
│   │   ├── mockData.ts                  # Realistic ministry seed data
│   │   └── reportService.ts             # CRUD, review workflow, audit logger
│   ├── types/
│   │   └── index.ts                     # TypeScript domain models & enums
│   ├── App.tsx                          # Root application component
│   ├── index.css                        # Tailwind directives & typography
│   ├── main.tsx                         # React 18 DOM mount point
│   └── vite-env.d.ts                    # Vite client types & environment interface
├── supabase/
│   ├── migrations/
│   │   └── 20261107_initial_schema.sql  # Complete DDL, RLS policies, triggers
│   └── seed.sql                         # Initial regions and reporting periods
├── .env.example                         # Environment variable definitions
├── index.html                           # Single-page application entry point
├── package.json                         # Dependencies and npm build scripts
├── postcss.config.js                    # PostCSS processor config
├── tailwind.config.js                   # Custom FNI color system & tokens
├── tsconfig.json                        # TypeScript compiler config
├── vercel.json                          # Vercel SPA routing configuration
└── vite.config.ts                       # Vite bundler configuration
```

---

## 7. Setup & Installation

### Prerequisites
- Node.js `v18+` or `v20+` (tested on Node v24)
- npm or pnpm

### Local Development Setup
```bash
# 1. Clone repository & enter directory
cd fni-reporting-system

# 2. Install dependencies
npm install

# 3. Configure environment variables (Optional for demo mode)
cp .env.example .env

# 4. Start local Vite development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Supabase Backend Integration

1. Create a new project in [Supabase](https://supabase.com).
2. Navigate to **SQL Editor** in the Supabase Dashboard.
3. Open and run `supabase/migrations/20261107_initial_schema.sql`.
4. Open and run `supabase/seed.sql` to populate initial regions and periods.
5. In **Project Settings** > **API**, copy:
   - `Project URL`
   - `Project API Key (anon/public)`
6. Update your `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```
7. Rebuild or restart `npm run dev`. The system automatically detects Supabase credentials and switches to live PostgreSQL storage with Row Level Security.

---

## 9. Vercel Production Deployment

The project is preconfigured for zero-friction deployment to Vercel:

1. Push the code repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, import the repository as a **Vite** project.
3. Set the Root Directory to the project folder (or repository root).
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_EMAIL_NOTIFICATION_ENABLED=true`
   - `VITE_WHATSAPP_NOTIFICATION_ENABLED=true`
5. Click **Deploy**. Vercel will run `tsc && vite build` and serve the application via edge CDN with full SPA routing handled by `vercel.json`.

---

## 10. Verification & Testing Instructions

You can immediately test every feature out-of-the-box using the sticky top **Role Preview Tester**:

1. **Super Admin Mode**:
   - Inspect global organization numbers: 8 cells, 21 souls won, 128 attendance.
   - Access **Administration** to register new cells, create regions, or open Week 46.
   - Access **Audit Trail** to inspect immutable action logs.
2. **Regional Leader Mode (Lagos Central)**:
   - Notice the scoped dashboard reflecting Lagos Central metrics.
   - Go to **Report Management** → Click **Review** on a report → Enter review feedback → Click **Approve Report** or **Request Revision**.
   - Go to **Regional Oversight** to review assigned cells and click **Remind** on outstanding cells.
3. **Cell Leader Mode (Brother Michael Okon - Grace Cell VI)**:
   - Notice restricted navigation (Administration and Regional Oversight are hidden per RBAC).
   - Click **Submit Weekly Report** → Complete Step 1 (Attendance), Step 2 (Evangelism), Step 3 (Meeting), Step 4 (Pastoral Remarks).
   - Click **Submit Formal Report** or **Save Draft**.
   - Verify the report immediately appears in your Report Management list.
4. **Notifications Center**:
   - Click the bell icon in the top header.
   - Switch between **In-App Feed**, **WhatsApp Alerts**, and **Email Gateway**.
   - Click **Trigger Notice** to test simulated multi-channel dispatch.
