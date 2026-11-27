import type { Metadata } from "next";
import { DashboardOverview } from "@/components/dashboard/overview";

export const metadata: Metadata = {
  title: "Your dashboard",
  description: "Your saved jobs and companies, your job alerts and your account.",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
