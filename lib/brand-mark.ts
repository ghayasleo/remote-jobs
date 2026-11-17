// The Remote Jobs mark: a sun rising over the horizon ("work from anywhere,
// optimistic"). Single source for the in-app logo and every generated icon
// (scripts/generate-icons.mts). No runtime imports so Node can load it directly.

export const BRAND = {
  violet: "#753ee2", // oklch(0.53 0.23 292), --primary
  sun: "#fab72a", // oklch(0.82 0.16 80), --sun
  white: "#ffffff",
  darkChrome: "#0c0c0c", // oklch(0.155 0 0), dark --background
} as const;

/** Glyph drawn on a 512x512 canvas, centred so it survives maskable-icon crops. */
export const GLYPH = {
  sun: "M164 300 A92 92 0 0 1 348 300 Z",
  horizon: { x: 104, y: 318, width: 304, height: 32 },
  path: { x: 176, y: 374, width: 160, height: 28 },
  rays: [-150, -120, -90, -60, -30].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const [cx, cy, inner, outer] = [256, 300, 120, 152];
    return {
      x1: Math.round(cx + inner * Math.cos(rad)),
      y1: Math.round(cy + inner * Math.sin(rad)),
      x2: Math.round(cx + outer * Math.cos(rad)),
      y2: Math.round(cy + outer * Math.sin(rad)),
    };
  }),
};

/** Standalone SVG. `shape: "rounded"` for app icons, `"square"` for maskable/Apple icons. */
export function brandMarkSvg({ shape = "rounded" }: { shape?: "rounded" | "square" } = {}) {
  const { sun, horizon, path, rays } = GLYPH;
  const radius = shape === "rounded" ? 116 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${BRAND.violet}"/>
  ${rays.map((r) => `<line x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" stroke="${BRAND.sun}" stroke-width="22" stroke-linecap="round"/>`).join("\n  ")}
  <path d="${sun}" fill="${BRAND.sun}"/>
  <rect x="${horizon.x}" y="${horizon.y}" width="${horizon.width}" height="${horizon.height}" rx="${horizon.height / 2}" fill="${BRAND.white}"/>
  <rect x="${path.x}" y="${path.y}" width="${path.width}" height="${path.height}" rx="${path.height / 2}" fill="${BRAND.white}" opacity="0.7"/>
</svg>
`;
}
