"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BellIcon, BookmarkIcon, Building2Icon, FileTextIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openSignIn, useProfile } from "@/lib/auth/client";

const ACCESS = [
  { icon: BookmarkIcon, text: "See, save, move and remove your saved jobs" },
  { icon: Building2Icon, text: "See, save and remove your saved companies" },
  { icon: BellIcon, text: "See and delete your job alerts" },
  { icon: FileTextIcon, text: "Read and edit your CVs, and tailor them to saved jobs" },
];

type Check = { ok: true; clientName: string; redirectHost: string } | { ok: false; message: string; redirect: string | null };

/** Asks the signed-in person whether an AI app may use their RemoteJobs account. */
export function OAuthConsent() {
  const params = useSearchParams();
  const query = params.toString();
  const profile = useProfile();
  const [check, setCheck] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/oauth/authorize?${query}`)
      .then((response) => response.json() as Promise<Check>)
      .then(setCheck)
      .catch(() => setCheck({ ok: false, message: "Couldn't check this request. Please try again.", redirect: null }));
  }, [query]);

  const answer = async (allow: boolean) => {
    setBusy(true);
    const response = await fetch("/api/oauth/authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ params: query, allow }),
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { redirect?: string | null } | null;
    if (body?.redirect) window.location.assign(body.redirect);
    else setBusy(false);
  };

  if (!check) return <div className="h-72" aria-busy="true" />;
  if (!check.ok) {
    return (
      <div className="rounded-3xl border p-6">
        <h1 className="text-xl font-bold">This sign-in can&apos;t go ahead</h1>
        <p className="mt-2 text-muted-foreground">{check.message}</p>
        {check.redirect && (
          <Button className="mt-5 h-11 rounded-full px-5" onClick={() => window.location.assign(check.redirect!)}>
            Back to the app
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-card p-6 sm:p-8">
      <span className="grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
        <ShieldCheckIcon className="size-6" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-balance">Let {check.clientName} use your RemoteJobs account?</h1>
      <p className="mt-2 text-muted-foreground">
        After you allow it, you&apos;ll go back to <span className="font-medium text-foreground">{check.redirectHost}</span>. It will be able to:
      </p>
      <ul className="mt-5 grid gap-3">
        {ACCESS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-muted-foreground">It can&apos;t see your password or anything in your Google account. You can disconnect it at any time from your
        Account page.</p>
      {profile ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="h-11 rounded-full px-6" disabled={busy} onClick={() => answer(true)}>
            Allow
          </Button>
          <Button variant="ghost" className="h-11 rounded-full px-5" disabled={busy} onClick={() => answer(false)}>
            Deny
          </Button>
          <p className="w-full text-xs text-muted-foreground">Signed in as {profile.name ?? "you"}.</p>
        </div>
      ) : (
        <Button className="mt-6 h-11 rounded-full px-6" onClick={() => openSignIn("Sign in to let this app use your RemoteJobs account.")}>
          Sign in to continue
        </Button>
      )}
    </div>
  );
}
