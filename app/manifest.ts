import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand-mark";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Remote Jobs",
    short_name: "Remote Jobs",
    description: "Remote-friendly tech companies, by region and stack, with live open roles.",
    start_url: "/jobs",
    scope: "/",
    display: "standalone",
    background_color: BRAND.white,
    theme_color: BRAND.violet,
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Hiring now", url: "/companies?hiring=true", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Saved companies", url: "/saved", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
