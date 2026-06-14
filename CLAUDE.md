# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Public, transparent map of broken traffic lights ("semáforos malogrados") in Lima, Perú. Citizens report a broken light (photo + location + description); it appears on a public map; authorities ("modo autoridad") move each incident through a lifecycle (Reportado → Revisado → En reparación → Resuelto). Transparency is the product. UI strings and code comments are in Spanish — keep new user-facing text and the existing comment style in Spanish.

## Commands

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5173 (host:true, exposed on LAN)
npm run build    # production build to dist/
npm run preview  # serve the production build
```

There is no test runner, linter, or formatter configured.

## Architecture

React + Vite SPA (PWA), no router. State lives in `App.jsx`; all persistence goes through a swappable data layer.

### Swappable backend (the central design point)

`src/data/store.js` is a backend selector. At import time it picks **one** backend and re-exports its async interface, so no UI component knows which is active:

- If Supabase credentials are present in `.env` → `supabaseStore.js` (real Postgres, shared).
- Otherwise → `localStore.js` (browser `localStorage`, demo, seeded from `data/seed.js`).

`isSupabaseConfigured` (in `supabaseClient.js`) gates this — it requires both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to be set **and not equal to the `.env.example` placeholders**. `DATA_SOURCE` exports the choice; the topbar pill shows 🟢 Supabase / 🟡 Demo local.

**Both backends must implement the identical async interface:** `listIncidents`, `getIncident`, `findNearby`, `createIncident`, `updateStatus`, `getStats`. If you add or change a method, change both `localStore.js` and `supabaseStore.js` (and re-export it from `store.js`). Pure, backend-agnostic logic (Haversine `distanceMeters`, `computeStats`, `computeDashboard`, `resolveDays`, `ageDays`) lives in `data/helpers.js` and is shared by both.

The canonical in-app incident shape (camelCase: `faultType`, `createdAt`, `history[]`, etc.) is produced by `mapRow()` in `supabaseStore.js` from snake_case DB rows. Match that shape when touching either backend.

### Domain model

`src/constants.js` is the single source of truth for the status lifecycle (`STATUSES`, `STATUS_ORDER`), fault types (`FAULT_TYPES`), and districts (`DISTRICTS`). Status keys (`reported`, `acknowledged`, `in_progress`, `resolved`, `duplicate`) must stay in sync with the `check` constraint in `supabase/schema.sql`.

### Auth & "modo autoridad"

`src/data/auth.js` wraps Supabase Auth with an observable store (`initAuth`, `onAuthChange`, `getAuthState`, `signIn`, `signOut`). Reviewer status is derived from `user.app_metadata.role === 'reviewer'` — `app_metadata` can only be set by `service_role`, so users cannot self-promote. `isReviewer` only gates UI affordances (showing authority actions in `IncidentDetail`); the real enforcement is RLS in the database. When Supabase is not configured, auth resolves to a logged-out, non-reviewer state.

### Supabase backend (`supabase/schema.sql`)

Paste the whole file once into the Supabase SQL Editor. It creates PostGIS, the `incidents` and `status_changes` tables, a generated `geom` column, a trigger that auto-inserts the first `status_changes` row on insert (so anonymous clients never write history directly), RLS policies, and the public `incident-photos` Storage bucket.

RLS ships in **two phases**: Phase 1 (active, insecure — anyone can update status, for testing) and Phase 2 (commented out — only `reviewer` role can update). The `updateStatus`/`createIncident` flows in `supabaseStore.js` assume the trigger handles initial history and that updates write a `status_changes` row.

Photos: `ReportForm` captures a data URL; `supabaseStore.uploadPhoto` converts it to a Blob and uploads to the `incident-photos` bucket, storing the public URL. `localStore` keeps the data URL inline.

### Views

`App.jsx` switches between three views over the same incident list: `MapView` (Leaflet + OpenStreetMap, pins colored by status), `IncidentList`, and `DashboardView` (transparency metrics from `computeDashboard`). `ReportForm` and `IncidentDetail` are modals; `AuthModal` handles login/logout.

## Environment

Copy `.env.example` to `.env`. Without real Supabase values the app runs entirely on `localStorage` — that is the default demo mode, and the LAN-exposed dev server is intentional for mobile testing.
