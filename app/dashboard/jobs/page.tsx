import type { Metadata } from "next";
import { SavedJobsScreen } from "@/components/dashboard/saved-jobs-screen";

export const metadata: Metadata = { title: "Saved jobs" };

export default function SavedJobsPage() {
  return <SavedJobsScreen />;
}
