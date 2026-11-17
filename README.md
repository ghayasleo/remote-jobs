# Remote Jobs

Find remote-friendly tech companies by where you're based and what you build with, and see who's hiring right now. Works on phones like an app (installable, offline-friendly) and on desktop.

Live at [remotejobs.ghayasuddin.net](https://remotejobs.ghayasuddin.net).

## Where the data comes from

- **Company profiles** come from [remoteintech/remote-jobs](https://github.com/remoteintech/remote-jobs), a community-maintained list. The whole repo is downloaded as one tarball and every `src/companies/*.md` file (YAML frontmatter plus Markdown sections) is parsed on the server. Pages refresh daily.
- **Open roles** come from the public APIs of the job boards companies use: Greenhouse, Lever, Ashby, Workable and Recruitee. They refresh hourly. Which board belongs to which company lives in [`data/job-boards.json`](data/job-boards.json), produced by `npm run boards:scan` (see below).
- **Logos** are company favicons, fetched through `/logo/[domain]` so visitors' browsers never contact Google.

## Stack

Next.js 16 (App Router, Cache Components, Partial Prefetching), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), Vitest. Deployed on Vercel.

## Getting started

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server. Prerenders every company page. |
| `npm test` | Unit tests (tar reader, profile parser, job-board normalizers, Explore filters) |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm run boards:scan` | Re-detects which job board each company uses and rewrites `data/job-boards.json`. Takes about two minutes. Try a few companies without writing anything with `npm run boards:scan -- --only gitlab,stripe`. |
| `npm run icons` | Re-renders the favicon, app icons and Apple touch icon from `lib/brand-mark.ts` |

Run `boards:scan` every few weeks, or when companies are added upstream, and commit the updated JSON. A board is only kept when the provider's API answers for it and, where the API reports a company name, the name matches. If a wrong match slips through, add the company to `EXCLUDE` in `scripts/find-job-boards.mts`.

## Project layout

```
app/                 routes: Explore (/), company pages, Saved, About, offline, manifest, logo proxy
components/          UI: shell (header, tab bar), explore, company, saved, shadcn/ui primitives
lib/data/            server data: tarball reader, profile parser, cached loaders, job-board providers
lib/                 shared logic: Explore filters and URL state, saved list, brand mark
data/job-boards.json company → job board map (generated)
scripts/             board scanner and icon generator
tests/               Vitest tests and fixtures (trimmed real API responses)
PRODUCT.md           who this is for and the design principles
DESIGN.md            the visual system
```

## Contributing a company

Add or edit companies upstream in [remoteintech/remote-jobs](https://github.com/remoteintech/remote-jobs/blob/main/CONTRIBUTING.md). Changes show up here within a day of being merged.
