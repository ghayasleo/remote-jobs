"use client";

import Link from "next/link";
import { LogOutIcon, UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { openSignIn, signOut, useProfile } from "@/lib/auth/client";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

const SIGN_IN_ENABLED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

/** "Sign in" when signed out; the person's photo with a small menu when signed in. */
export function AccountMenu({ className }: { className?: string }) {
  const profile = useProfile();
  const hydrated = useHydrated();
  if (!SIGN_IN_ENABLED) return null;
  // The prerendered page can't know who's signed in: hold the space instead of flashing "Sign in".
  if (!hydrated) return <span aria-hidden className={cn("block h-10 w-10 sm:w-24", className)} />;

  if (!profile) {
    return (
      <button
        type="button"
        onClick={() => openSignIn()}
        className={cn(
          "flex h-10 w-10 items-center justify-center gap-2 rounded-full text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto sm:px-4",
          className,
        )}
      >
        <UserRoundIcon className="size-5 sm:size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">Sign in</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "grid size-10 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
        aria-label={`Account: ${profile.name ?? "signed in"}`}
      >
        <Avatar profile={profile} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
        <DropdownMenuLabel className="truncate px-2 py-1.5">{profile.name ?? "Signed in"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-xl px-2 py-2">
          <Link href="/account">
            <UserRoundIcon aria-hidden />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl px-2 py-2"
          onSelect={async () => {
            if (await signOut()) toast("Signed out");
          }}
        >
          <LogOutIcon aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
