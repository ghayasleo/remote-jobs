"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { BellIcon, BookmarkCheckIcon, FileTextIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { loadGoogleIdentity, onOpenSignIn, signInWithCredential } from "@/lib/auth/client";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

const PERKS = [
  { icon: BookmarkCheckIcon, text: "Save jobs and companies, and track every application on your dashboard" },
  { icon: BellIcon, text: "Alerts when new roles match what you're looking for" },
  { icon: FileTextIcon, text: "Your CV tools, saved and ready when you come back" },
];

/** Google's own button, rendered into a box once its script has loaded. */
function GoogleButton({ onDone }: { onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    loadGoogleIdentity()
      .then((id) => {
        if (cancelled || !box.current) return;
        id.initialize({
          client_id: CLIENT_ID,
          ux_mode: "popup",
          use_fedcm_for_button: true,
          callback: async ({ credential }: { credential: string }) => {
            const result = await signInWithCredential(credential);
            if (result.ok) {
              toast.success("You're signed in");
              onDone();
            } else {
              toast.error(result.error);
            }
          },
        });
        id.renderButton(box.current, {
          type: "standard",
          theme: resolvedTheme === "dark" ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.min(box.current.clientWidth || 320, 400),
        });
        setState("ready");
      })
      .catch(() => !cancelled && setState("failed"));
    return () => {
      cancelled = true;
    };
  }, [resolvedTheme, onDone]);

  return (
    <div className="grid min-h-11 place-items-center">
      {/* Google's button is an iframe: in dark mode the page's color scheme would paint it a white backdrop. */}
      <div ref={box} className="flex w-full justify-center [color-scheme:light]" />
      {state === "loading" && <span className="text-sm text-muted-foreground">Loading Google sign-in…</span>}
      {state === "failed" && (
        <span className="text-center text-sm text-muted-foreground">
          Google sign-in couldn&apos;t load. Check your connection or any blocker, then try again.
        </span>
      )}
    </div>
  );
}

/** Mounted once in the layout; opened from the header or any "sign in to sync" prompt. */
export function SignInDialog() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const close = useCallback(() => setOpen(false), []);

  useEffect(
    () =>
      onOpenSignIn((why) => {
        setReason(why);
        setOpen(true);
      }),
    [],
  );

  if (!CLIENT_ID) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <div className="grid gap-1.5 pr-8">
          <DialogTitle>Sign in to RemoteJobs</DialogTitle>
          <DialogDescription>
            {reason ?? "Every job and company stays free to browse. Sign in to save them, track your applications and get alerts."}
          </DialogDescription>
        </div>
        <ul className="grid gap-3 py-1">
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="pt-1.5">{text}</span>
            </li>
          ))}
        </ul>
        {open && <GoogleButton onDone={close} />}
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="mt-px size-4 shrink-0" aria-hidden />
          <span>
            We get only your name, email and photo from Google, and never post or share anything. See the{" "}
            <Link href="/privacy" className="underline underline-offset-2" onClick={close}>
              privacy policy
            </Link>
            .
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
