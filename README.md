# TechFin Dashboard

Web-based dashboard built with:

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **shadcn/ui** — component library (18 components pre-installed in `src/components/ui/`)
- **Recharts** — charts, via the shadcn chart wrapper
- **Supabase** — database and auth (`@supabase/supabase-js` + `@supabase/ssr`)
- **Vercel** — deployment

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Connecting Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Copy `.env.example` to `.env.local` and fill in the values from
   **Project Settings → API**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```

3. Query from code:
   - **Server Components / Route Handlers / Server Actions:**
     `const supabase = await createClient()` from `@/lib/supabase/server`
   - **Client Components:**
     `const supabase = createClient()` from `@/lib/supabase/client`

Auth session refresh is handled in `src/proxy.ts` (it no-ops until the env
vars above are set).

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new) — Next.js is detected
   automatically, no config needed.
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables in
   **Project Settings → Environment Variables**.

Alternatively, deploy from the CLI: `npx vercel`.

## Project structure

```
src/
├── app/                  # App Router pages and layout
│   ├── layout.tsx        # Root layout (fonts, Toaster)
│   └── page.tsx          # Dashboard overview page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── app-sidebar.tsx   # Dashboard navigation sidebar
│   └── overview-chart.tsx# Revenue area chart (placeholder data)
├── lib/
│   ├── supabase/         # Supabase client factories (browser + server)
│   └── utils.ts          # cn() class helper
└── proxy.ts              # Auth session middleware
```

## Adding more UI components

```bash
npx shadcn@latest add <component-name>   # e.g. calendar, popover, form
```

Browse the catalog at [ui.shadcn.com](https://ui.shadcn.com/docs/components).
