"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

/** Each tap moves to the next one. */
const ORDER: Theme[] = ["light", "dark", "system"];
const THEMES = {
  light: { label: "Light", Icon: SunIcon, rotate: "25deg" },
  dark: { label: "Dark", Icon: MoonIcon, rotate: "-25deg" },
  system: { label: "Match device", Icon: MonitorIcon, rotate: "25deg" },
} as const;

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
const resolve = (theme: Theme) => (theme === "system" ? (prefersDark() ? "dark" : "light") : theme);

/**
 * The theme switch: one button that steps through Light, Dark and Match
 * device. When the colours change, the new theme spreads out from the button
 * in a circle (a View Transition clipped from the button's centre), and the
 * icon fades out, then turns and scales in. Without View Transitions, or with
 * reduced motion, the theme simply switches.
 */
export function AnimatedThemeToggler({ className }: { className?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hydrated = useHydrated();
  const { theme, setTheme } = useTheme();
  const current: Theme = theme === "light" || theme === "dark" ? theme : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  // The icon on screen while the old one fades out, then null so it follows the theme.
  const [leaving, setLeaving] = useState<Theme | null>(null);
  // Animate only after the first tap, not when the page first shows the icon.
  const [animated, setAnimated] = useState(false);

  async function toggle() {
    const button = buttonRef.current;
    const from = resolve(current);
    const to = resolve(next);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setAnimated(true);
    setLeaving(current);

    // Match device can land on the same colours: only the icon changes then.
    if (from === to || !button || reduceMotion || typeof document.startViewTransition !== "function") {
      setTheme(next);
      return;
    }

    await document.startViewTransition(() => {
      flushSync(() => setTheme(next));
      // next-themes applies the class after rendering; the new snapshot needs it now.
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(to);
      root.style.colorScheme = to;
    }).ready;

    const { left, top, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 700, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
    );
  }

  const shown = leaving ?? current;
  const { Icon, rotate } = THEMES[shown];
  const label = `Theme: ${THEMES[current].label}. Switch to ${THEMES[next].label}.`;

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={hydrated ? label : "Switch theme"}
      title={hydrated ? label : undefined}
      className={cn("size-11 rounded-full", className)}
    >
      {hydrated ? (
        <Icon
          key={`${shown}-${leaving ? "out" : "in"}`}
          aria-hidden
          style={{ "--theme-icon-rotate": rotate } as React.CSSProperties}
          className={cn("size-5", animated && (leaving ? "animate-theme-icon-out" : "animate-theme-icon-in"))}
          onAnimationEnd={() => setLeaving(null)}
        />
      ) : (
        <span className="size-5" aria-hidden />
      )}
    </Button>
  );
}
