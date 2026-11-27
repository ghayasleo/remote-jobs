import type { Metadata } from "next";
import { ScreenHeading } from "@/components/dashboard/screen-heading";
import { SavedCompanies } from "@/components/saved/saved-companies";

export const metadata: Metadata = { title: "Saved companies" };

export default function SavedCompaniesPage() {
  return (
    <>
      <ScreenHeading title="Saved companies" className="mb-1.5" />
      <div className="-mx-4 max-w-[calc(48rem+3rem)] sm:-mx-6">
        <SavedCompanies embedded />
      </div>
    </>
  );
}
