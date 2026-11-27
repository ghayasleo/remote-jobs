import type { Metadata } from "next";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Wider than the reading pages: the saved jobs board needs the room.
  return (
    <div className="mx-auto max-w-[90rem] px-4 pt-2 pb-12 sm:px-6">
      <DashboardFrame>{children}</DashboardFrame>
    </div>
  );
}
