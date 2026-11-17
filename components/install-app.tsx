"use client";

import { CheckCircle2Icon, DownloadIcon, PlusSquareIcon, ShareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { promptInstall, useInstallState } from "@/lib/install-prompt";

/** Install the site as an app, explained for whatever browser you're on. */
export function InstallApp() {
  const state = useInstallState();

  if (state === "installed") {
    return (
      <p className="flex items-center gap-2 font-medium">
        <CheckCircle2Icon className="size-5 text-primary" aria-hidden />
        You’re using the installed app. Nice.
      </p>
    );
  }
  if (state === "prompt") {
    return (
      <div className="space-y-3">
        <p>Add Remote Jobs to your home screen or dock. It opens in its own window and works offline.</p>
        <Button className="h-11 rounded-full px-5" onClick={() => promptInstall()}>
          <DownloadIcon aria-hidden /> Install the app
        </Button>
      </div>
    );
  }
  if (state === "ios") {
    return (
      <ol className="space-y-2">
        <li className="flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">1</span>
          Tap <ShareIcon className="inline size-4" aria-label="Share" /> Share in Safari’s toolbar.
        </li>
        <li className="flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">2</span>
          Choose <PlusSquareIcon className="inline size-4" aria-hidden /> Add to Home Screen.
        </li>
      </ol>
    );
  }
  return (
    <p>
      Open this site in Chrome, Edge or Safari on your phone to add it to your home screen. It opens like an app and
      works offline.
    </p>
  );
}
