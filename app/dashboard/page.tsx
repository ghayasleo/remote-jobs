import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = {
  title: "Your dashboard",
  description: "Your saved jobs and companies, every application from Saved to Offer, and your job alerts.",
  robots: { index: false },
};

export default function DashboardPage() {
  // Wider than the reading pages: the applications board needs the room.
  return (
    <div className="mx-auto max-w-[90rem] px-4 pb-12 sm:px-6">
      <DashboardView />
    </div>
  );
}
