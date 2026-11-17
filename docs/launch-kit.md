# Launch kit

Everything here is a draft for you to post from your own accounts. Numbers were
accurate on 17 Nov 2026; check `/insights` for today's before posting.

## 1. One-time setup (about 20 minutes, all free)

Every environment variable is described in [`.env.example`](../.env.example). Add them in Vercel → Project → Settings → Environment Variables (Production), then redeploy: values are read at build time.

- [ ] **Turn on Vercel Web Analytics.** Vercel dashboard → remote-jobs → Analytics → Enable. The code is already in the app; it just isn't switched on, so no visits are being counted yet. It's cookie-free, so it never needs the cookie question.
- [ ] **Google Analytics 4.** At analytics.google.com create a property for the site and a Web data stream for `https://remotejobs.ghayasuddin.net`. Keep "Enhanced measurement" on: its "Page changes based on browser history events" setting is what counts in-app navigation. Copy the Measurement ID (`G-…`).
- [ ] **Google Tag Manager.** At tagmanager.google.com create a Web container and copy its ID (`GTM-…`). Inside it, add a **Google tag** with your GA4 Measurement ID, triggered on "Initialization – All Pages", then Submit → Publish. Set `NEXT_PUBLIC_GTM_ID` in Vercel and redeploy.
  - Prefer GA4 without Tag Manager? Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` instead. Don't do both while GA4 is also in the container, or visits count twice.
  - Consent is handled in the app (Google Consent Mode v2): visitors in the EEA, UK and Switzerland are asked first, everyone can change their answer under "Cookie choices", and ad storage is always off. In Tag Manager, leave the GA4 tag's built-in consent checks on.
  - Check it: Tag Manager → Preview, or GA4 → Reports → Realtime while you browse the site.
- [ ] **Google Search Console.** Add the property `https://remotejobs.ghayasuddin.net` and choose "HTML tag". Copy only the `content` value and add it in Vercel as `GOOGLE_SITE_VERIFICATION`. Redeploy, click Verify, then submit `https://remotejobs.ghayasuddin.net/sitemap.xml` under Sitemaps. If the same Google account owns the GA4 property or Tag Manager container, the "Google Analytics" or "Google Tag Manager" verification methods work too.
  - Link it to GA4 (GA4 → Admin → Product links → Search Console) to see search queries next to visits.
- [ ] **Bing Webmaster Tools.** Sign in and import the site from Search Console (one click), or set `BING_SITE_VERIFICATION` the same way.
- [ ] **Check Google Jobs markup.** In Search Console → Enhancements → Job postings (appears after Google crawls a few role pages). Or paste a role URL into https://search.google.com/test/rich-results.

## 2. Show HN

Post Tuesday to Thursday, 8–10am US Eastern. Reply to every comment in the first two hours.

**Title:** Show HN: Remote Jobs – 2,800 remote roles at 876 remote-friendly tech companies

**URL:** https://remotejobs.ghayasuddin.net

**Text:**

> I built a browsable version of the community-run remoteintech/remote-jobs list (876 remote-friendly tech companies) and added live open roles.
>
> For about 166 companies it finds the public job board they use (Greenhouse, Lever, Ashby, Workable or Recruitee) by reading their careers pages, verifies it against the board's own company name, and pulls roles hourly. That's ~2,800 remote roles right now, each with its own page.
>
> You can filter by where you're based (a company that hires worldwide counts for every region), stack, policy and size; save companies (stays on your device); and install it as an app. There's also a live "state of remote hiring" page: https://remotejobs.ghayasuddin.net/insights
>
> Built with Next.js 16 and shadcn/ui. No accounts, no ads. Feedback very welcome, especially on wrong board matches.

## 3. Product Hunt

- **Name:** Remote Jobs
- **Tagline (60 chars max):** Remote-friendly tech companies, plus who's hiring right now
- **Description:** Browse 876 remote-friendly tech companies by where you live and what you build with, and see ~2,800 live remote roles pulled straight from their job boards every hour. Save a shortlist, install it on your phone, no sign-up.
- **First comment:** why you built it, the remoteintech credit, and one honest limitation (only companies on the five supported job boards show live roles).
- **Gallery:** screenshots of Explore on a phone, a company page with open roles, the Jobs feed, and /insights. The share cards at `/company-profiles/<slug>/opengraph-image` also work as images.

## 4. Reddit

Read each subreddit's self-promotion rules first; most allow it only in a weekly thread or as a genuine "feedback wanted" post.

- **r/webdev (Showoff Saturday):** focus on the build: Next.js 16 cache components, partial prefetching, a hand-written service worker, detecting job boards from careers pages.
- **r/remotework, r/digitalnomad:** "I made a free list of tech companies that hire worldwide, with live roles". Lead with the worldwide filter: https://remotejobs.ghayasuddin.net/remote/worldwide
- **r/cscareerquestions:** only in their weekly threads if allowed; link the Jobs feed filtered to engineering: https://remotejobs.ghayasuddin.net/jobs?category=engineering

## 5. LinkedIn

> I rebuilt Remote Jobs, a free directory of 876 remote-friendly tech companies.
>
> What's new: live open roles. For 166 companies it reads their public job board every hour, so you can see ~2,800 remote roles, filter by where you're based and your stack, and apply on the company's own site.
>
> Also new: a live "state of remote hiring" page. Right now 37% of open roles at these companies are remote, and only 12% of remote listings show pay.
>
> No sign-up, no ads: https://remotejobs.ghayasuddin.net

## 6. Article outline (dev.to / Hashnode / your blog)

**"Turning a GitHub list into a live remote-jobs site with Next.js 16"**

1. The starting point: a community Markdown list that changed format under me
2. Reading 876 companies from one tarball instead of 876 requests (and why streaming it broke React's dev tooling)
3. Finding each company's job board from its careers page, and how a name check stopped wrong matches
4. Cache Components + Partial Prefetching: a prerendered app that still updates hourly
5. Making it feel like an app: bottom sheets, state that survives Back, offline support
6. Google Jobs markup for 2,800 role pages
7. What I'd do next

Link the article to the site and to /insights; articles like this are the most reliable source of backlinks.

## 7. Note to the remoteintech maintainers

Post as a GitHub Discussion (not an issue, unless they ask) at https://github.com/remoteintech/remote-jobs:

> **Title:** A browsable view of the list, with live open roles
>
> Hi! Thanks for maintaining this list. I've built https://remotejobs.ghayasuddin.net on top of it: it reads `src/companies/*.md` daily, credits the project on every page, and links "Suggest an edit" back to each company's file here.
>
> It also adds live open roles for companies whose careers pages use a public job board. If any of that is useful to you (for example a "hiring now" signal, or spotting dead careers links), I'm happy to share the code or data. And if you'd ever consider linking to it, that would be lovely, no pressure at all.

## 8. Ongoing

- Share one number from `/insights` each week (e.g. "X% of remote listings show pay").
- Run `npm run boards:scan` every few weeks (or enable the weekly Action) so new companies get live roles.
- Watch Search Console → Pages for "Crawled, currently not indexed" on role pages; if it grows, make role descriptions richer before adding more pages.
