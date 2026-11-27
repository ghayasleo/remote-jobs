"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOutIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/auth/client";
import { signOutAndForget } from "@/lib/sync";
import { useHydrated } from "@/lib/use-hydrated";
import { Avatar } from "./avatar";

export function AccountView() {
  const hydrated = useHydrated();
  const profile = useProfile();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((body: { user: { email: string } | null }) => setEmail(body.user?.email ?? null))
      .catch(() => {});
  }, [profile]);

  // The dashboard asks signed-out visitors to sign in before showing this.
  if (!hydrated || !profile) return <div className="h-40" />;

  return (
    <div className="grid gap-6">
      <section className="flex items-center gap-4 rounded-3xl border p-5">
        <Avatar profile={profile} className="size-14 text-lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{profile.name ?? "Signed in"}</p>
          <p className="truncate text-muted-foreground">{email ?? "Signed in with Google"}</p>
        </div>
      </section>

      <section className="rounded-3xl border p-5">
        <h2 className="font-bold">What&apos;s kept in your account</h2>
        <p className="mt-1 text-muted-foreground">
          Your saved jobs and companies, with their statuses and notes, and your job alerts, so they follow you to any
          device you sign in on. Signing out removes them from this browser; they stay in your account. See{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            the privacy policy
          </Link>{" "}
          for the details.
        </p>
        <Button
          variant="outline"
          className="mt-4 h-11 rounded-full px-5"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            if (await signOutAndForget()) toast("Signed out");
            setBusy(false);
          }}
        >
          <LogOutIcon aria-hidden />
          Sign out
        </Button>
      </section>

      <section className="rounded-3xl border border-destructive/30 p-5">
        <h2 className="font-bold">Delete your account</h2>
        <p className="mt-1 text-muted-foreground">
          Removes your account and everything stored with it, from our servers and from this browser. This can&apos;t
          be undone.
        </p>
        {confirming ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="destructive"
              className="h-11 rounded-full px-5"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await signOutAndForget({ deleteAccount: true });
                setBusy(false);
                if (ok) {
                  toast("Your account was deleted");
                  router.push("/");
                } else {
                  toast.error("That didn't work. Please try again.");
                }
              }}
            >
              <Trash2Icon aria-hidden />
              Yes, delete everything
            </Button>
            <Button variant="ghost" className="h-11 rounded-full px-5" onClick={() => setConfirming(false)}>
              Keep my account
            </Button>
          </div>
        ) : (
          <Button variant="destructive" className="mt-4 h-11 rounded-full px-5" onClick={() => setConfirming(true)}>
            <Trash2Icon aria-hidden />
            Delete account
          </Button>
        )}
      </section>
    </div>
  );
}
