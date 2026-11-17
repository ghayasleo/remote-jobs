import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Remote Jobs",
  description: "Remote-friendly tech companies, with live open roles.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={figtree.className}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
