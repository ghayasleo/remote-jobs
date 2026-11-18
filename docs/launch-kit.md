# Launch kit

Everything here is a draft for you to post from your own accounts. Numbers were
accurate on 17 Nov 2026; check `/insights` for today's before posting.

## 1. One-time setup (about 20 minutes, all free)

Every environment variable is described in [`.env.example`](../.env.example). Add them in Vercel → Project → Settings → Environment Variables (Production), then redeploy: values are read at build time.

- [x] **Turn on Vercel Web Analytics.** (Done 18 Nov 2026.) Vercel dashboard → remote-jobs → Analytics → Enable. The code is already in the app; it just isn't switched on, so no visits are being counted yet. It's cookie-free, so it never needs the cookie question.
- [x] **Google Analytics 4.** (Done 18 Nov 2026.) At analytics.google.com create a property for the site and a Web data stream for `https://remotejobs.ghayasuddin.net`. Keep "Enhanced measurement" on: its "Page changes based on browser history events" setting is what counts in-app navigation. Copy the Measurement ID (`G-…`).
- [x] **Google Tag Manager.** (Done 18 Nov 2026.) At tagmanager.google.com create a Web container and copy its ID (`GTM-…`). Inside it, add a **Google tag** with your GA4 Measurement ID, triggered on "Initialization – All Pages", then Submit → Publish. Set `NEXT_PUBLIC_GTM_ID` in Vercel and redeploy.
  - Prefer GA4 without Tag Manager? Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` instead. Don't do both while GA4 is also in the container, or visits count twice.
  - Consent is handled in the app (Google Consent Mode v2): visitors in the EEA, UK and Switzerland are asked first, everyone can change their answer under "Cookie choices", and ad storage is always off. In Tag Manager, leave the GA4 tag's built-in consent checks on.
  - Check it: Tag Manager → Preview, or GA4 → Reports → Realtime while you browse the site.
- [x] **Google Search Console.** (Done 18 Nov 2026.) Add the property `https://remotejobs.ghayasuddin.net` and choose "HTML tag". Copy only the `content` value and add it in Vercel as `GOOGLE_SITE_VERIFICATION`. Redeploy, click Verify, then submit `https://remotejobs.ghayasuddin.net/sitemap.xml` under Sitemaps. If the same Google account owns the GA4 property or Tag Manager container, the "Google Analytics" or "Google Tag Manager" verification methods work too.
  - Link it to GA4 (GA4 → Admin → Product links → Search Console) to see search queries next to visits.
- [x] **Bing Webmaster Tools.** (Done 18 Nov 2026: verified through Search Console, sitemap imported, 3.7K URLs discovered.) At bing.com/webmasters sign in with the Google account and choose "Import from Google Search Console": it brings the site, its verification and the sitemap in one step. Bing's index also feeds ChatGPT search, Copilot and DuckDuckGo, so this matters more than Bing's own share suggests.
- [x] **Switch on IndexNow.** (Done 18 Nov 2026: first run accepted by IndexNow. Run it by hand any time with `vercel crons run /api/indexnow`.) In Vercel → Settings → Environment Variables (Production) add `CRON_SECRET` with a long random value (`openssl rand -hex 32`), then redeploy. From then on a daily cron tells Bing, Yandex and other IndexNow engines about new roles. Check it a day later in Bing Webmaster Tools → IndexNow.
- [x] **Check Google Jobs markup.** (Done 18 Nov 2026: a US role passes the Rich Results Test with 1 valid item; only the optional `validThrough` and `baseSalary` are missing, which the boards don't publish.) In Search Console → Enhancements → Job postings (appears after Google crawls a few role pages). Or paste a role URL into https://search.google.com/test/rich-results. Roles open worldwide ("Remote", "Global") have no job markup on purpose: Google requires at least one country.

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

## 8. Get mentioned elsewhere

Search engines and AI assistants (ChatGPT, Perplexity, Google's AI answers) trust and cite sites that other sites mention. Use the same name and one-line description everywhere so they connect the mentions:

> **Remote Jobs**: a free directory of 876 remote-friendly tech companies and the ~2,800 remote roles they're hiring for, updated hourly. https://remotejobs.ghayasuddin.net

- [ ] **Your own profiles first.** Add the project to your portfolio's Work section, your LinkedIn Featured and Projects sections, and your GitHub profile README. These are the links you control, and they tie the site to you.
- [ ] **The GitHub repo's About box.** Website: the site URL. Description: the line above. Topics: `remote-jobs`, `remote-work`, `job-board`, `nextjs`.
- [ ] **Awesome lists.** Open a pull request adding the site to [lukasz-madon/awesome-remote-job](https://github.com/lukasz-madon/awesome-remote-job) ("Job boards aggregators" section) and similar curated remote-work lists. Read each list's contributing rules first.
- [ ] **Free product directories.** AlternativeTo (list it as an alternative to other remote job boards), Indie Hackers products, Peerlist Launchpad, Uneed. One listing each, filled in properly, beats dozens of thin ones.
- [ ] **Answer real questions.** When someone on Reddit, Stack Exchange or a forum asks which companies hire remotely from their region, answer the question itself and link the matching page (for example `/remote/europe/python`). Say you made it. Only where it genuinely helps.
- [ ] **Offer the numbers.** Remote-work newsletters, bloggers and journalists quote figures like "only 12% of remote listings show pay". Send them `/insights`; the page asks for a link back when quoted, and that link is worth more than any directory.

Skip paid link schemes, link exchanges and directory-submission services: search engines discount them and can penalise the site.

## 9. Ongoing

- Share one number from `/insights` each week (e.g. "X% of remote listings show pay").
- Run `npm run boards:scan` every few weeks (or enable the weekly Action) so new companies get live roles.
- Watch Search Console → Pages for "Crawled, currently not indexed" on role pages; if it grows, make role descriptions richer before adding more pages.
- Look at Bing Webmaster Tools → IndexNow now and then: each day should show a submission with status 200 or 202.
