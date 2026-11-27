"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOutIcon, Trash2Icon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { openSignIn, signOut, useProfile } from "@/lib/auth/client";
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

  if (!hydrated) return <div className="h-40" />;

  if (!profile) {
    return (
      <div className="rounded-3xl border p-6">
        <UserRoundIcon className="size-8 text-muted-foreground" aria-hidden />
        <h2 className="mt-3 text-lg font-bold">You&apos;re not signed in</h2>
        <p className="mt-1 max-w-[30rem] text-muted-foreground">
          Signing in is optional. It keeps your saved jobs, application tracker and alerts in sync across your devices.
        </p>
        <Button className="mt-5 h-11 rounded-full px-5" onClick={() => openSignIn()}>
          Sign in with Google
        </Button>
      </div>
    );
  }

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
          Your saved jobs, your application tracker and your alerts, so they follow you to any device you sign in on. See{" "}
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
            if (await signOut()) toast("Signed out");
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
          Removes your account and everything stored with it. Anything saved on this device stays here.
        </p>
        {confirming ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="destructive"
              className="h-11 rounded-full px-5"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await signOut({ deleteAccount: true });
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
