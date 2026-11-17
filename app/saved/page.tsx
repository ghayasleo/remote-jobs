import type { Metadata } from "next";
import { SavedCompanies } from "@/components/saved/saved-companies";

export const metadata: Metadata = {
  title: "Saved companies",
  description: "Your shortlist of remote-friendly tech companies, kept on this device.",
  robots: { index: false },
};

export default function SavedPage() {
  return <SavedCompanies />;
}
