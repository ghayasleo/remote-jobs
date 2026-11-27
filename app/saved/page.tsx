import type { Metadata } from "next";
import { SavedView } from "@/components/saved/saved-view";

export const metadata: Metadata = {
  title: "Saved jobs and companies",
  description: "Your saved remote jobs, where each application stands, and your shortlist of companies.",
  robots: { index: false },
};

export default function SavedPage() {
  return <SavedView />;
}
