import Link from "next/link";
import { AccountMenu } from "@/components/auth/account-menu";
import { Wordmark } from "@/components/brand/logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { DesktopNav } from "./nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-(--z-nav) border-b bg-background pt-safe">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="-mx-1 rounded-lg px-1 py-1">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <DesktopNav />
          <AnimatedThemeToggler />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
