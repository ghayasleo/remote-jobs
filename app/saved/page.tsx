import type { Metadata } from "next";
import { SavedCompanies } from "@/components/saved/saved-companies";
import { getExploreData } from "@/lib/data/explore-data";

export const metadata: Metadata = {
  title: "Saved companies",
  description: "Your shortlist of remote-friendly tech companies, kept on this device.",
  robots: { index: false },
};

export default async function SavedPage() {
  const data = await getExploreData();
  return <SavedCompanies {...data} />;
}
