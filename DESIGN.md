---
name: Remote Jobs
description: A bright, calm directory of remote-friendly tech companies, built phone-first.
colors:
  violet: "oklch(0.53 0.23 292)"
  violet-night: "oklch(0.74 0.16 292)"
  lavender-wash: "oklch(0.955 0.025 292)"
  lavender-ink: "oklch(0.38 0.15 292)"
  sunrise: "oklch(0.82 0.16 80)"
  hiring-wash: "oklch(0.95 0.08 90)"
  hiring-ink: "oklch(0.42 0.1 70)"
  paper: "oklch(1 0 0)"
  mist: "oklch(0.97 0.008 292)"
  ink: "oklch(0.2 0.03 292)"
  slate-ink: "oklch(0.47 0.03 292)"
  hairline: "oklch(0.91 0.012 292)"
  night: "oklch(0.155 0 0)"
  region-worldwide: "oklch(0.95 0.04 195)"
  region-americas: "oklch(0.95 0.035 35)"
  region-europe: "oklch(0.95 0.035 255)"
  region-americas-europe: "oklch(0.95 0.035 340)"
  region-asia-pacific: "oklch(0.95 0.045 150)"
typography:
  headline:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
rounded:
  sm: "0.525rem"
  md: "0.7rem"
  lg: "0.875rem"
  xl: "1.225rem"
  2xl: "1.575rem"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-wide: "24px"
  row: "16px"
  section: "36px"
components:
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    height: "44px"
    padding: "0 20px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "44px"
    padding: "0 20px"
  chip-filter:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 14px"
  chip-filter-selected:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 14px"
  badge-hiring:
    backgroundColor: "{colors.hiring-wash}"
    textColor: "{colors.hiring-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "24px"
    padding: "0 10px"
  input-search:
    backgroundColor: "{colors.mist}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "48px"
    padding: "0 48px"
  list-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "16px"
  tab-active-indicator:
    backgroundColor: "{colors.lavender-wash}"
    textColor: "{colors.lavender-ink}"
    rounded: "{rounded.full}"
    width: "56px"
    height: "32px"
---

# Design System: Remote Jobs

## Overview

**Creative North Star: "First Light"**

The logo is the word “remotejobs” with a striped sun as its “o”, and the whole interface takes its cue from that: morning light on a clean page. Job hunting is tiring, so the surface stays quiet and bright (pure white by day, true near-black at night) and lets one confident violet and a warm sunrise yellow do the encouraging. Colour is spent on meaning: what you selected, who's hiring, where a company hires. Nothing is decorative.

It's a tool first. Density is comfortable rather than packed; every list row answers "is this company for me?" in one glance (name, where they hire, policy, stack, hiring), and everything else is one tap away. On phones it behaves like a native app: pinned search, a bottom tab bar, bottom sheets for filters, an action bar on detail screens, and state that survives going back.

It is not a cluttered job board, a gradient-blob SaaS template, a gamified toy, or cold enterprise software (see PRODUCT.md).

**Key Characteristics:**
- Restrained surfaces, vibrant meaning: violet for action and selection, sunrise for hiring, six soft region tints.
- One typeface, Figtree, at a fixed rem scale.
- Pills everywhere you tap (buttons, chips, search), soft 0.875rem corners on containers.
- Flat: depth comes from hairlines and tonal washes, not shadows.
- Phone-first ergonomics: 44px touch targets on coarse pointers, safe-area padding, thumb-reachable actions.

## Colors

A white or near-black canvas carrying one saturated violet, one warm sunrise accent, and a small family of soft region tints. Every text pair below is at least 4.5:1 in both themes.

### Primary
- **Violet** (oklch(0.53 0.23 292), dark theme oklch(0.74 0.16 292)): primary buttons, selected filter chips, links, focus rings, the saved bookmark, active-tab text. Never a background for large areas.
- **Lavender Wash / Lavender Ink** (oklch(0.955 0.025 292) / oklch(0.38 0.15 292)): the quiet form of violet. Active tab and desktop-nav pills, active-filter pills, "New" badge, initials avatars.

### Secondary
- **Sunrise** (oklch(0.82 0.16 80)): the dot in the hiring badge and the sun in the logo. Small doses only.
- **Hiring Wash / Hiring Ink** (oklch(0.95 0.08 90) / oklch(0.42 0.1 70)): the "Hiring · N remote roles" badge, the offline notice, the empty-roles icon. It always means "opportunity" or "heads up", never decoration.

### Tertiary: region tints
Six soft washes with strong same-hue text, always paired with a label and a globe icon: Worldwide (teal, hue 195), Americas (coral, 35), Europe (blue, 255), Americas & Europe (magenta, 340), Asia Pacific (green, 150), Other (neutral violet-grey). Foreground values sit at L≈0.43–0.47 in light mode and L≈0.86 in dark mode.

### Neutral
- **Paper** (oklch(1 0 0)): page and card background, light theme.
- **Night** (oklch(0.155 0 0)): page background, dark theme; cards lift to oklch(0.2 0 0).
- **Mist** (oklch(0.97 0.008 292)): search field fill, row hover, secondary surfaces.
- **Ink** (oklch(0.2 0.03 292)): body text and headings.
- **Slate Ink** (oklch(0.47 0.03 292)): secondary text (meta lines, hints, counts). 6.9:1 on paper.
- **Hairline** (oklch(0.91 0.012 292)): borders and row dividers; in dark mode, white at 10%.

### Named Rules
**The Colour Means Something Rule.** Violet marks action or selection, sunrise marks hiring, region tints mark geography. If a colour isn't saying one of those things, it's grey.

**The Label Always Rule.** A colour never carries meaning alone: region chips say the region, selected chips show a check mark, hiring badges say "Hiring".

## Typography

**Display Font:** none (no display face)
**Body Font:** Figtree (with ui-sans-serif, system-ui)

**Character:** Figtree is a friendly geometric sans with open, round forms. Warm without being cute, so one family carries headings, labels, data and prose.

### Hierarchy
- **Headline** (700, 1.5rem on phones and 1.875rem from 640px, tracking -0.025em): page titles ("Find your next remote team", company names).
- **Title** (700, 1.125rem, tracking -0.025em): section headings on company and About pages.
- **Row title** (600, 1rem, line-height 1.5): company names in lists, role titles.
- **Body** (400, 1rem, line-height 1.6–1.75): profile prose, capped at 36rem (about 75 characters in Figtree).
- **Body small** (400–500, 0.875rem): meta lines, blurbs in rows, hints, counts.
- **Label** (500–600, 0.75rem): chips and badges. Sentence case, no tracking.

### Named Rules
**The Measured Line Rule.** Prose never runs wider than 36rem. Use rem for measure, not `ch`: Figtree's zero is wide, so 65ch fits about 90 characters.

**The Calm Wrap Rule.** Headings use `text-wrap: balance`; paragraphs, list items and definitions use `text-wrap: pretty`.

## Layout

Phone-first, single column, with 16px gutters (24px from 640px). The Explore page becomes a two-column layout at 1024px: a sticky 15.5rem filter sidebar beside a results column, inside a 72rem container. Company profiles stay a single 48rem reading column at every width; About and Saved use 42rem and 48rem.

On phones the app shell is fixed chrome around a scrolling list: a 56px top bar (plus the safe-area inset), the search and quick-filter row pinned under it, and a 64px bottom tab bar (plus the safe-area inset). Company pages swap the tab bar for an action bar of the same height. Lists run edge to edge on phones and sit inside a rounded, bordered container from 1024px.

The spacing rhythm is Tailwind's 4px grid: 16px row padding, 8–12px between related items, 28px between filter groups, 36px between profile sections.

## Elevation & Depth

Flat. There are no resting shadows: depth comes from hairline borders, tonal washes (mist, lavender), and the sticky chrome's bottom border. The only floating surfaces are the bottom sheet, dropdown menus and toasts, which use the shadcn defaults and an overlay.

### Named Rules
**The No-Glass Rule.** No blur or translucency on chrome. The top bar, pinned search and tab bar are solid background colour with a hairline.

## Shapes

Two shapes, used consistently. Anything you tap is a pill (fully rounded): buttons, filter chips, search field, badges, active-tab indicator. Anything that contains is a soft rounded rectangle: lists and cards at 1.575rem (`rounded-2xl`), logos at 0.7–1.225rem. Dashed borders mark "nothing here yet" panels (empty results, empty saved, notices). The logo is the wordmark “remotejobs” in one ink colour (Figtree 800, tracking −0.04em) with the striped sun as its “o”; it never changes colour except to flip ink for dark mode. The app icon is that sun alone on a 512-unit ink square (radius 116), centred inside the maskable safe zone. Both come from `lib/brand-mark.ts`; `npm run icons` regenerates the icon files.

## Components

### Buttons
- **Shape:** pill, 44px tall with 20px side padding for primary actions.
- **Primary:** violet fill, white text.
- **Outline:** paper fill, hairline border, ink text; hover fills with mist.
- **Ghost:** no fill, slate-ink text, mist on hover. Used for sort, back and clear actions.
- **Focus:** a 2px violet outline offset by 2px, via `:focus-visible`.

### Chips
- **Filter chips:** pill, 36px tall (44px on touch screens), hairline outline. Selected chips fill violet with white text and a check icon.
- **Region chips:** 24px pill in the region's wash with same-hue ink, a globe icon and the label.
- **Tags** (size, stack): 24px pill with a hairline outline and slate-ink text.
- **Hiring badge:** hiring wash with hiring ink and a small sunrise dot. Reads "Hiring · N remote roles" (or open roles when none are remote).

### Lists
- **Company row:** the whole row is the link (the name has a stretched hit area); Save sits on top at the top right. Order: 44px logo, name (+ New badge), domain · policy, a two-line blurb, then a chip row with hiring badge, region, size and up to three stack tags (+N).
- **Role row:** title with an outbound arrow, workplace badge (Remote in the worldwide tint, Hybrid neutral, On-site outlined), then location · team · type, then salary and posted date.
- **Rows** are divided by hairlines; hover and keyboard focus tint the row with mist.

### Inputs
- **Search:** 48px pill in mist with a search icon on the left and a clear button on the right. 16px text so iOS doesn't zoom. Updates results 200ms after typing stops.

### Navigation
- **Phone tab bar:** three tabs (Explore, Saved with a count badge, About). The active tab gets a lavender pill behind the icon and ink-coloured label text.
- **Desktop:** the same three links in the top bar, the active one in a lavender pill.
- **Back:** a ghost "← All companies" button that returns to the previous screen with its state intact.

### Signature: Filter sheet
On phones every filter lives in a bottom sheet (88dvh max) with grouped chip sections and a pinned footer: "Clear all" and a primary "Show N companies" that updates live as you tap.

## Do's and Don'ts

### Do:
- **Do** keep violet for actions, selection and focus only.
- **Do** pair every coloured chip with a text label (and a check for selected state).
- **Do** use pills for interactive elements and `rounded-2xl` containers for groups.
- **Do** give touch targets at least 44px on coarse pointers (`pointer-coarse:h-11`).
- **Do** design empty, loading, offline and error states that suggest the next step (one-tap filter removal, retry, a link to Saved).
- **Do** keep motion to 150–250ms ease-out state changes, and honour `prefers-reduced-motion`.

### Don't:
- **Don't** use gradient text, glassmorphism, side-stripe borders or decorative shadows.
- **Don't** add a second accent colour or use the hiring yellow for anything but hiring and notices.
- **Don't** use uppercase tracked eyebrows or numbered section markers.
- **Don't** set prose wider than 36rem.
- **Don't** hide content behind hover; everything must work by touch and keyboard.
