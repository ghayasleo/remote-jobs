"use client";

import { RssIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = { path: string; children: React.ReactNode; className?: string };

/** Copies one of the site's addresses (for an app to use) instead of opening it. */
export function CopyAddressButton({
  path,
  children,
  className,
  icon,
  what,
  hint,
  variant = "outline",
}: CopyButtonProps & {
  /** A rendered icon (a server page can't pass the component itself). */
  icon: React.ReactNode;
  what: string;
  hint: string;
  variant?: "default" | "outline";
}) {
  const onClick = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`${what[0].toUpperCase()}${what.slice(1)} copied`, { description: hint });
    } catch {
      toast.error(`Couldn’t copy the ${what}`, { description: url });
    }
  };

  return (
    <Button variant={variant} onClick={onClick} className={cn("h-10 rounded-full px-4", className)}>
      {icon}
      {children}
    </Button>
  );
}

/**
 * Copies an RSS feed's address instead of linking to it: opening a feed in a
 * browser shows raw XML, but pasting the address into a feed reader works.
 */
export function CopyFeedButton(props: CopyButtonProps) {
  return <CopyAddressButton {...props} icon={<RssIcon aria-hidden />} what="feed address" hint="Paste it into a feed reader such as Feedly or Inoreader." />;
}
