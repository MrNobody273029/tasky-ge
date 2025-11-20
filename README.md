# Tasky.ge (Starter)

Ultra-modern cyber/neon marketplace starter built with **Next.js (App Router) + TypeScript + Tailwind + next-intl**.
- Default locale: **ka**
- KA/EN translations in `/messages`
- Left vertical navbar (glass & neon), sticky top tabs on My Page
- Pages: Home, Tasky list, Public Task, Owner Profile, Log In (stub), Register (stub), My Page (Created, Taken, Balance, Settings), Create Task, Submit Deliverables, Admin stub
- SEO: Metadata, OpenGraph, `sitemap.ts`, `robots.txt`
- Mobile-ready via Tailwind responsive utilities

## Quick start
```bash
pnpm i   # or npm i / yarn
pnpm dev
# open http://localhost:3000/ka
```

## Production
Configure your platform and set env vars (see `.env.local.example`). Then:
```bash
pnpm build && pnpm start
```

> This is a UI/UX demo with mock data (1 task, 1 owner). Replace with real API/DB later.
