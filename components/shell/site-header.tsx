import { AccountMenu } from "@/components/auth/account-menu";
import { Wordmark } from "@/components/brand/logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { HomeLink } from "./home-link";
import { DashboardLink, DesktopNav } from "./nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-(--z-nav) border-b bg-background pt-safe">
      <div className="relative mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 md:h-16 md:grid-cols-[1fr_auto_1fr]">
        <HomeLink className="-mx-1 justify-self-start rounded-lg px-1 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Wordmark />
        </HomeLink>
        <DesktopNav />
        <div className="flex items-center justify-self-end gap-1">
          <AnimatedThemeToggler />
          <DashboardLink />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
