# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server → http://localhost:3000/ka (default locale)
npm run build        # prisma generate + next build
npm run start        # Production server
npm run lint         # ESLint via next lint
npm run seed         # Seed DB with demo data (ts-node prisma/seed.ts)
```

Database changes:
```bash
npx prisma migrate dev --name <name>   # Create and apply migration
npx prisma studio                       # GUI for DB
```

## Tech Stack

- **Next.js 14** App Router, TypeScript, Tailwind CSS
- **Prisma + PostgreSQL (Neon)** — ORM with serverless pooling
- **next-intl** — i18n with `[locale]` dynamic route segment; locales: `ka` (default), `en`; translations in `/messages/`
- **Cloudinary** — signed upload URLs for photos/videos/files
- **Vercel** deployment with cron jobs in `vercel.json` (10-min intervals)

## Architecture

### Routing

All user-facing pages live under `app/[locale]/`. The root `/` redirects to `/ka`. API routes live under `app/api/` and are locale-agnostic.

Key route groups:
- `[locale]/` — Main feed and task browsing
- `[locale]/mypage/` — User dashboard (tabs: created, taken, balance, settings, proofs, requests)
- `[locale]/workspace/[id]/` — Task evidence submission
- `[locale]/chats/[threadId]/` — Messaging threads
- `[locale]/admin/` — Admin panel (users, disputes, analytics)
- `[locale]/auth/` — Login, register

### Authentication

`src/lib/auth.ts` — core auth logic:
- **httpOnly cookies**: `x-user-id` (user ID) + `x-user-sig` (HMAC-SHA256 of the ID with `AUTH_SECRET`)
- Call `ensureUserFromReq(req)` at the top of every protected API route — returns the User or throws 401
- Passwords hashed with Node.js native `scrypt`
- Dev mode skips signature check; production enforces it

### Task Model (Two Acquisition Modes)

`exclusive: false` — **Open tasks (TaskClaim)**: Multiple workers claim via `POST /api/tasks/[id]/take`. No upfront gating.

`exclusive: true` — **Exclusive tasks (TaskApplication)**: Workers apply → owner reviews → owner approves one → chat thread auto-created. Owner pays a publish fee on task creation.

### Evidence & Work Submission Flow

1. Worker submits `TaskEvidence` (text + media) to `POST /api/tasks/[id]/evidence`
2. Owner reviews: `APPROVED` | `REJECTED` | `NEEDS_FIXES` (worker can resubmit with `fixForId` linking to previous)
3. On approval, payment is released and both parties rate each other (1–5 stars)
4. Cron auto-approves evidence untouched for 7 days (`/api/cron/auto-approve-evidences`)

### Dispute / Arbitration System

Triggered when a worker disputes an owner's decision on evidence:
1. Party A submits dispute text + photos → status `OPEN`
2. Party B has 48–72h window → status `WAITING_OTHER` → `BOTH_SUBMITTED`
3. Admin reviews at `/admin/disputes` → resolves with optional fund split (JSON on `Dispute.fundSplit`)
4. Cron auto-resolves if counter-party never responds (`/api/cron/auto-resolve-disputes`)

### Modal System

Task detail modals use **custom browser events** to decouple opener from modal:
```ts
window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { id } }))
```
`TaskModalHost` (in the locale layout) listens for this event and syncs state to URL query param `?modalTask=<id>` and `localStorage['tasky.openTask']`. This enables browser back/forward support.

### Wallet / Payments

`WalletTransaction` is the ledger. Key types: `EARNING`, `PUBLISH_FEE`, `WITHDRAWAL`, `OTHER`.
Commission stored per-user as `commissionPct` (default 10%). No external payment processor — balances are tracked in DB only (demo/internal).

### API Conventions

- All responses on error: `{ error: 'snake_case_code' }` + appropriate HTTP status
- After mutations that affect cached pages, call `revalidatePath()`
- Auth: always call `ensureUserFromReq(req)` first; it throws structured errors
- Cloudinary: never accept a raw file on the API — client gets a signed URL from `/api/cloudinary/sign` and uploads directly

### Key Files

| Path | Purpose |
|------|---------|
| `src/lib/auth.ts` | Cookie auth, `ensureUserFromReq`, password hashing |
| `prisma/schema.prisma` | Full DB schema (12 models) |
| `prisma/seed.ts` | Demo data: admin (`info@tasky.ge`) + demo owner |
| `app/[locale]/layout.tsx` | Locale layout — mounts `LeftNav`, `TaskModalHost`, `FloatingChatButton` |
| `src/components/TaskModal.tsx` | Main task interaction modal (~1400 lines) |
| `src/components/LeftNav.tsx` | Sidebar; detects auth from cookies/localStorage |
| `tailwind.config.js` | Custom neon color palette and dark mode config |
| `messages/ka.json`, `messages/en.json` | i18n translation strings |

### Environment Variables

Required in `.env.local` (see `.env.local.example`):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `AUTH_SECRET` — HMAC secret for cookie signing
- `CLOUDINARY_URL` — Cloudinary credentials
- `CRON_SECRET` — Vercel cron authentication header value
- `CLOUDINARY_ASSETS_ROOT` — Upload folder prefix (default: `"tasky"`)
- `NEXT_PUBLIC_APP_URL` — Optional, used for SEO/OG tags
