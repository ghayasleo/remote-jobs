"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon, BotIcon, BriefcaseIcon, Building2Icon, ChevronRightIcon, FileTextIcon, LogOutIcon, Trash2Icon, UnplugIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/auth/client";
import { confirmAction } from "@/lib/confirm";
import { ACCOUNT_MCP_ENABLED, CV_MAKER_ENABLED } from "@/lib/features";
import { useSavedSlugs } from "@/lib/saved";
import { signOutAndForget } from "@/lib/sync";
import { useTrackedJobs } from "@/lib/tracker";
import { useHydrated } from "@/lib/use-hydrated";
import { Avatar } from "./avatar";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function AccountView() {
  const hydrated = useHydrated();
  const profile = useProfile();
  const router = useRouter();
  const jobs = useTrackedJobs().length;
  const companies = useSavedSlugs().length;
  const [email, setEmail] = useState<string | null>(null);
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

  const signOut = async () => {
    setBusy(true);
    if (await signOutAndForget()) toast("Signed out");
    setBusy(false);
  };

  const deleteAccount = async () => {
    const ok = await confirmAction({
      title: "Delete your account?",
      description: `Your account, saved jobs and companies, notes${CV_MAKER_ENABLED ? ", CVs" : ""} and job alerts will be deleted for good. This can't be undone.`,
      confirmLabel: "Delete everything",
      cancelLabel: "Keep my account",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const deleted = await signOutAndForget({ deleteAccount: true });
    setBusy(false);
    if (deleted) {
      toast("Your account was deleted");
      router.push("/");
    } else {
      toast.error("That didn't work. Please try again.");
    }
  };

  const disconnect = async () => {
    const ok = await confirmAction({
      title: "Disconnect all AI apps?",
      description: "Every app using your account through the RemoteJobs MCP server, like Claude, is signed out at once. To use one again, connect it again.",
      confirmLabel: "Disconnect all",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const response = await fetch("/api/oauth/disconnect", { method: "POST" }).catch(() => null);
    setBusy(false);
    if (response?.ok) toast("All apps were disconnected");
    else toast.error("That didn't work. Please try again.");
  };

  const kept = [
    { href: "/dashboard/jobs", icon: BriefcaseIcon, label: "Saved jobs", detail: `${plural(jobs, "job", "jobs")}, with statuses and notes` },
    { href: "/dashboard/companies", icon: Building2Icon, label: "Saved companies", detail: plural(companies, "company", "companies") },
    ...(CV_MAKER_ENABLED ? [{ href: "/dashboard/cv", icon: FileTextIcon, label: "CVs", detail: "Your main CV and its tailored copies" }] : []),
    { href: "/dashboard/alerts", icon: BellIcon, label: "Job alerts", detail: "The searches you get notified about" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      <section className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-3xl border bg-card p-5 sm:p-6">
        <Avatar profile={profile} className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-bold tracking-tight">{profile.name ?? "Signed in"}</p>
          {/* The line is there before the email arrives, so nothing moves when it does. */}
          <p className="truncate text-muted-foreground">{email ?? "\u00a0"}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Signed in with Google</p>
        </div>
        <Button variant="outline" className="h-11 w-full rounded-full px-5 sm:w-auto" disabled={busy} onClick={signOut}>
          <LogOutIcon aria-hidden />
          Sign out
        </Button>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-3xl border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-bold">What&apos;s kept in your account</h2>
          <p className="mt-1 text-muted-foreground">
            So it follows you to every device you sign in on. Signing out removes it from this browser; it stays in your
            account.
          </p>
          <ul className="mt-4 divide-y overflow-hidden rounded-2xl border">
            {kept.map(({ href, icon: Icon, label, detail }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{label}</span>
                    <span className="block truncate text-sm text-muted-foreground">{detail}</span>
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            See{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              the privacy policy
            </Link>{" "}
            for exactly what&apos;s stored and why.
          </p>
        </section>

        <div className="grid content-start gap-4">
          {ACCOUNT_MCP_ENABLED && (
            <section className="rounded-3xl border bg-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <BotIcon className="size-5 text-muted-foreground" aria-hidden />
                AI apps
              </h2>
              <p className="mt-1 text-muted-foreground">
                Apps you let use your account, like Claude, through the RemoteJobs MCP server. Disconnecting signs all of them out.
              </p>
              <Button variant="outline" className="mt-5 h-11 rounded-full px-5" disabled={busy} onClick={disconnect}>
                <UnplugIcon aria-hidden />
                Disconnect all apps
              </Button>
            </section>
          )}
          <section className="flex flex-col rounded-3xl border border-destructive/30 bg-card p-5 sm:p-6">
            <h2 className="text-lg font-bold">Delete your account</h2>
            <p className="mt-1 flex-1 text-muted-foreground">
              Deletes your account and everything stored with it, from our servers and from this browser. This can&apos;t be
              undone.
            </p>
            <Button variant="destructive" className="mt-5 h-11 self-start rounded-full px-5" disabled={busy} onClick={deleteAccount}>
              <Trash2Icon aria-hidden />
              Delete account
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
