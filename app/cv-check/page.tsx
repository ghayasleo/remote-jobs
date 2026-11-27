import type { Metadata } from "next";
import { CvCheck } from "@/components/cv/cv-check";

export const metadata: Metadata = {
  title: "Free CV check for remote jobs",
  description:
    "Check how hiring systems read your CV and how it lines up with a remote role: the skills it mentions, what's missing, and the requirements to check. Free, and your CV never leaves your device.",
  alternates: { canonical: "/cv-check" },
};

export default function CvCheckPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-12 sm:px-6">
      <h1 className="max-w-[40rem] text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.035em] text-balance">
        Check your CV against a remote role
      </h1>
      <p className="mt-4 max-w-[36rem] text-lg leading-relaxed text-pretty text-muted-foreground">
        See how a hiring system reads your CV, which of the posting&apos;s skills it mentions, and the requirements to check
        before you apply. Free, and private: your CV never leaves your device.
      </p>
      <div className="mt-10">
        <CvCheck />
      </div>
    </div>
  );
}
