# FNI Cells Connect

<div align="center">

**A digital workspace for cell reporting, coordination and ministry oversight.**

Forerunners Network International (FNI)

</div>

---

## Overview

FNI Cells Connect is a web application concept for helping FNI cell leaders and church administrators coordinate weekly reporting and follow-up in one place.

The project is designed around a clear, role-aware workflow: cell leaders submit reports, authorized leaders review submissions, and administrators monitor reporting activity.

## Core areas

- **Cell leader workspace** — access cell information and submit weekly reports.
- **Weekly reporting** — record attendance, visitors, outreach and other ministry activity.
- **Report review** — support submission review, feedback and status tracking.
- **Administration** — manage cell information and oversee reporting activity.
- **Reporting visibility** — make submitted information easier to review across the organization.

> Feature availability depends on the current application implementation and configured backend.

## Technology

| Area | Technology |
|---|---|
| Frontend | React, TypeScript |
| Build tooling | Vite |
| Styling | Tailwind CSS |
| Backend and database | Supabase (PostgreSQL) |
| Authentication and data access | Supabase Auth and Row Level Security |
| Charts and icons | Recharts, Lucide React |

**Backend direction:** Supabase is the intended backend for this project. Firebase is not part of the intended deployment architecture. Do not treat local seed or mock data as live ministry records.

## Getting started

### Requirements

- Node.js (LTS recommended)
- npm
- A Supabase project for live authentication and database functionality

### Install and run

```bash
git clone https://github.com/jk-larbi/FNI-Cells-Connect.git
cd FNI-Cells-Connect
npm install
npm run dev
```

### Configure Supabase

Create a local `.env` file and provide the project credentials expected by the application. Use the variable names documented in `.env.example`.

Never commit private keys, service-role credentials, passwords or real member information to the repository. The Supabase anon/publishable key may be used in a client application only when database access is correctly protected by Row Level Security policies.

### Build

```bash
npm run build
```

## Repository structure

- `src/` — application interface, components and services
- `supabase/migrations/` — database schema and policy migrations
- `supabase/seed.sql` — development seed data
- `.env.example` — environment variable template

## Security notes

- Keep privileged credentials on trusted server-side systems; never expose them in frontend code.
- Apply and test Row Level Security policies for every table containing protected data.
- Use real, authorized accounts for production verification.
- Do not use sample records as evidence of live reporting activity.

## Project

- [Source code](https://github.com/jk-larbi/FNI-Cells-Connect)
- [Report an issue](https://github.com/jk-larbi/FNI-Cells-Connect/issues)

---

<div align="center">

*Connecting cells. Strengthening fellowship. Advancing the mission.*

</div>
