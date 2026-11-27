import type { Metadata } from "next";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The same width as the site header, so the two line up.
  return (
    <div className="mx-auto max-w-6xl px-4 pt-2 pb-12 sm:px-6">
      <DashboardFrame>{children}</DashboardFrame>
    </div>
  );
}
