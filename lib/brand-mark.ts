// The Remote Jobs logo: the word "remotejobs" in one ink colour, with the "o"
// drawn as a sun with two stripes across its lower half. The sun on its own is
// the app icon. Single source for the in-app logo, every generated icon
// (scripts/generate-icons.mts) and the share images. No runtime imports so Node
// can load it directly.

export const BRAND = {
  violet: "#753ee2", // oklch(0.53 0.23 292), --primary
  sun: "#ffb21f",
  ink: "#16101f", // the app icon's tile
  white: "#ffffff",
  darkChrome: "#0c0c0c", // oklch(0.155 0 0), dark --background
} as const;

// The two stripes, as fractions of the sun's diameter measured from its top.
const STRIPES: [number, number][] = [
  [0.6, 0.67],
  [0.76, 0.86],
];

/**
 * The sun as three filled pieces (the stripes are the gaps between them), so
 * it renders the same everywhere, including share images, which can't use
 * SVG masks.
 */
export function sunPaths(cx: number, cy: number, r: number): string[] {
  const top = cy - r;
  const d = 2 * r;
  const half = (y: number) => Math.sqrt(Math.max(0, r * r - (y - cy) ** 2));
  const n = (value: number) => Math.round(value * 100) / 100;
  const cuts = STRIPES.map(([from, to]) => [top + from * d, top + to * d] as const);

  // Above the first stripe: everything over the line, so the long way round.
  const [y0] = cuts[0];
  const pieces = [`M${n(cx - half(y0))} ${n(y0)}A${r} ${r} 0 1 1 ${n(cx + half(y0))} ${n(y0)}Z`];
  // Between the stripes: a band with curved sides.
  const [, a] = cuts[0];
  const [b] = cuts[1];
  pieces.push(
    `M${n(cx - half(a))} ${n(a)}H${n(cx + half(a))}A${r} ${r} 0 0 1 ${n(cx + half(b))} ${n(b)}H${n(cx - half(b))}A${r} ${r} 0 0 1 ${n(cx - half(a))} ${n(a)}Z`,
  );
  // Below the second stripe: the bottom cap.
  const [, c] = cuts[1];
  pieces.push(`M${n(cx - half(c))} ${n(c)}H${n(cx + half(c))}A${r} ${r} 0 0 1 ${n(cx - half(c))} ${n(c)}Z`);
  return pieces;
}

/** The sun on a 100x100 canvas, as used for the "o". */
export const SUN_PATHS = sunPaths(50, 50, 48);

/** Standalone app icon SVG. `shape: "rounded"` for app icons, `"square"` for maskable/Apple icons. */
export function brandMarkSvg({ shape = "rounded" }: { shape?: "rounded" | "square" } = {}) {
  const radius = shape === "rounded" ? 116 : 0;
  // 55% of the tile, well inside the maskable safe zone.
  const sun = sunPaths(256, 256, 140);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${BRAND.ink}"/>
  ${sun.map((d) => `<path d="${d}" fill="${BRAND.sun}"/>`).join("\n  ")}
</svg>
`;
}
