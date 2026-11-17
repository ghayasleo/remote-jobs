// Renders every app icon from lib/brand-mark.ts. Re-run after changing the mark:
//   npm run icons

import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { brandMarkSvg } from "../lib/brand-mark.ts";

const root = new URL("../", import.meta.url);
const out = (path: string) => new URL(path, root);

const rounded = Buffer.from(brandMarkSvg({ shape: "rounded" }));
const square = Buffer.from(brandMarkSvg({ shape: "square" }));
const png = (svg: Buffer, size: number) => sharp(svg, { density: 300 }).resize(size, size).png().toBuffer();

// An .ico file can hold PNGs directly; every current browser reads them.
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

mkdirSync(out("public/icons"), { recursive: true });

const files: [string, Buffer | Promise<Buffer>][] = [
  ["app/icon.svg", rounded],
  ["app/apple-icon.png", png(square, 180)], // iOS rounds the corners itself
  ["public/icons/icon-192.png", png(rounded, 192)],
  ["public/icons/icon-512.png", png(rounded, 512)],
  ["public/icons/maskable-512.png", png(square, 512)],
  ["app/favicon.ico", Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(rounded, size) }))).then(ico)],
];

for (const [path, data] of files) {
  writeFileSync(out(path), await data);
  console.log(`wrote ${path}`);
}
