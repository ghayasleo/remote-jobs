import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CvScreen } from "@/components/cv-maker/cv-screen";
import { CV_MAKER_ENABLED } from "@/lib/features";

export const metadata: Metadata = { title: "Your CV" };

export default function CvPage() {
  // Development only for now (see lib/features.ts).
  if (!CV_MAKER_ENABLED) notFound();
  return (
    <Suspense fallback={<div className="h-96" />}>
      <CvScreen />
    </Suspense>
  );
}
