import type { Metadata } from "next";
import { SuggestForm } from "@/components/suggest-form";

export const metadata: Metadata = {
  title: "Suggest a company",
  description: "Know a remote-friendly tech company that isn't listed? Suggest it, and we'll add it with its open roles.",
  alternates: { canonical: "/suggest" },
};

export default function SuggestPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">Suggest a company</h1>
      <p className="mt-3 max-w-[34rem] text-lg leading-relaxed text-pretty text-muted-foreground">
        Know a tech company that hires remotely but isn&apos;t listed? Tell us, and we&apos;ll add it, along with its
        open roles when we can read its job board.
      </p>
      <div className="mt-8">
        <SuggestForm />
      </div>
    </div>
  );
}
