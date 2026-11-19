import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND, sunPaths } from "@/lib/brand-mark";

// Shared pieces for share images (Open Graph cards): the app icon's ink tile,
// white type and the striped sun. ImageResponse only understands inline
// styles and flexbox, so everything here is plain style objects.

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  bg: BRAND.ink,
  text: BRAND.white,
  muted: "#b9b2c9",
  soft: "#e4dfee",
  chip: "rgba(255,255,255,0.09)",
  chipBorder: "rgba(255,255,255,0.14)",
};

/** Figtree, the app's typeface (assets/fonts, SIL Open Font License). */
export const ogFonts = () =>
  Promise.all(
    [600, 800].map(async (weight) => ({
      name: "Figtree",
      weight: weight as 600 | 800,
      style: "normal" as const,
      data: await readFile(join(process.cwd(), `assets/fonts/figtree-latin-${weight}-normal.woff`)),
    })),
  );

/** The striped sun at any size. */
export function OgSun({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      {sunPaths(50, 50, 48).map((d) => (
        <path key={d} d={d} fill={BRAND.sun} />
      ))}
    </svg>
  );
}

/** The logo: "remotejobs" with the sun as its "o". */
export function OgWordmark({ fontSize }: { fontSize: number }) {
  const sun = Math.round(fontSize * 0.7);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", fontSize, fontWeight: 800, letterSpacing: -fontSize * 0.04, lineHeight: 1 }}>
      <span>rem</span>
      <OgSun size={sun} style={{ margin: `0 ${Math.round(fontSize * 0.015)}px ${Math.round(fontSize * 0.09)}px` }} />
      <span>tejobs</span>
    </div>
  );
}

/** A big sun rising from the bottom-right corner: the card's one decoration. */
export function OgHorizonSun() {
  return <OgSun size={440} style={{ position: "absolute", right: -190, bottom: -40 }} />;
}

export function OgChip({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "sun" }) {
  const sun = tone === "sun";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 22px",
        borderRadius: 999,
        fontSize: 26,
        fontWeight: 600,
        background: sun ? BRAND.sun : OG.chip,
        color: sun ? "#2b1b00" : OG.text,
        border: sun ? "none" : `2px solid ${OG.chipBorder}`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Swaps characters the bundled Figtree subset lacks for ones it has. A missing
 * glyph makes ImageResponse fetch a fallback font from Google Fonts, which can
 * stall or fail a build; non-breaking hyphens and spaces turn up in company names
 * and blurbs.
 */
export function ogText(text: string) {
  return text.replace(/[\u2010\u2011]/g, "-").replace(/[\u00a0\u2007\u202f]/g, " ");
}

/** Cuts text at a word boundary so it fits in roughly `max` characters. */
export function ogClip(text: string, max: number) {
  text = ogText(text);
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:\s]+$/, "")}…`;
}
