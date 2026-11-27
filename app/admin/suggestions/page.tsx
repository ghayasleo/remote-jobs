import { Suspense } from "react";
import type { Metadata } from "next";
import { SuggestionStatus } from "@/components/admin/suggestion-status";
import { RelativeTime } from "@/components/relative-time";
import { currentAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Company suggestions", robots: { index: false, follow: false } };

type Row = {
  id: string;
  name: string;
  website: string;
  careers_url: string | null;
  note: string | null;
  contact_email: string | null;
  status: string;
  created_at: string;
};

async function Suggestions() {
  const admin = await currentAdmin();
  if (!admin) {
    return <p className="text-muted-foreground">This page is only for the site&apos;s admins. Sign in with an admin account.</p>;
  }
  const rows = (await db()`
    select id, name, website, careers_url, note, contact_email, status, created_at
    from company_suggestions order by (status = 'new') desc, created_at desc limit 200`) as Row[];
  if (rows.length === 0) return <p className="text-muted-foreground">No suggestions yet.</p>;
  return (
    <ul className="divide-y rounded-2xl border">
      {rows.map((row) => (
        <li key={row.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="min-w-0">
            <p className="font-semibold">{row.name}</p>
            <p className="truncate text-sm">
              <a href={row.website} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                {row.website}
              </a>
              {row.careers_url && (
                <>
                  {" · "}
                  <a href={row.careers_url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                    careers
                  </a>
                </>
              )}
            </p>
            {row.note && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{row.note}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              <RelativeTime iso={new Date(row.created_at).toISOString()} />
              {row.contact_email && ` · ${row.contact_email}`}
            </p>
          </div>
          <SuggestionStatus id={row.id} status={row.status} />
        </li>
      ))}
    </ul>
  );
}

export default function SuggestionsAdminPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Company suggestions</h1>
      <div className="mt-6">
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
          <Suggestions />
        </Suspense>
      </div>
    </div>
  );
}
