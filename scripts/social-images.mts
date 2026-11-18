// Renders the Bluesky profile banner (3000×1000, Bluesky's 3:1) and avatar
// (1000×1000) into assets/social/, in the site's brand: the ink tile, the
// striped sun and the "remotejobs" wordmark in Figtree.
//
//   npm run social:images
//
// Bluesky puts the round avatar over the banner's bottom-left corner, so the
// words sit high on the left and the sun rises on the right.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createElement as h, type CSSProperties } from "react";
import { ImageResponse } from "next/og.js";
import sharp from "sharp";
import { BRAND, brandMarkSvg, sunPaths } from "../lib/brand-mark.ts";

const out = (path: string) => new URL(`../${path}`, import.meta.url);
const font = (weight: 600 | 800) => ({
  name: "Figtree",
  weight,
  style: "normal" as const,
  data: readFileSync(out(`assets/fonts/figtree-latin-${weight}-normal.woff`)),
});

const sun = (size: number, style?: CSSProperties) =>
  h("svg", { width: size, height: size, viewBox: "0 0 100 100", style }, ...sunPaths(50, 50, 48).map((d) => h("path", { key: d, d, fill: BRAND.sun })));

const wordmark = (fontSize: number) =>
  h(
    "div",
    { style: { display: "flex", alignItems: "flex-end", fontSize, fontWeight: 800, letterSpacing: -fontSize * 0.04, lineHeight: 1 } },
    h("span", null, "rem"),
    sun(Math.round(fontSize * 0.7), { margin: `0 ${Math.round(fontSize * 0.015)}px ${Math.round(fontSize * 0.09)}px` }),
    h("span", null, "tejobs"),
  );

const banner = h(
  "div",
  {
    style: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      position: "relative",
      width: "100%",
      height: "100%",
      padding: "0 0 150px 210px",
      background: BRAND.ink,
      color: BRAND.white,
      fontFamily: "Figtree",
      overflow: "hidden",
    },
  },
  sun(1100, { position: "absolute", right: -330, bottom: -90 }),
  wordmark(230),
  h("div", { style: { marginTop: 60, fontSize: 88, fontWeight: 600, color: "#e4dfee" } }, "New remote tech roles, every day"),
  h("div", { style: { marginTop: 26, fontSize: 60, fontWeight: 600, color: "#b9b2c9" } }, "remotejobs.ghayasuddin.net"),
);

const png = async (element: ReturnType<typeof h>, width: number, height: number) =>
  Buffer.from(await new ImageResponse(element, { width, height, fonts: [font(600), font(800)] }).arrayBuffer());

mkdirSync(out("assets/social"), { recursive: true });
const files: [string, Buffer][] = [
  // Bluesky takes images up to 1 MB; a flat ink background compresses well as a palette PNG.
  ["assets/social/bluesky-banner.png", await sharp(await png(banner, 3000, 1000)).png({ palette: true, compressionLevel: 9 }).toBuffer()],
  ["assets/social/bluesky-avatar.png", await sharp(Buffer.from(brandMarkSvg({ shape: "square" }))).resize(1000, 1000).png({ compressionLevel: 9 }).toBuffer()],
];
for (const [path, data] of files) {
  writeFileSync(out(path), data);
  console.log(`wrote ${path} (${Math.round(data.length / 1024)} KB)`);
}
