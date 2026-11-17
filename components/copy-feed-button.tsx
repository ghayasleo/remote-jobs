"use client";

import { RssIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Copies an RSS feed's address instead of linking to it: opening a feed in a
 * browser shows raw XML, but pasting the address into a feed reader works.
 */
export function CopyFeedButton({ path, children, className }: { path: string; children: React.ReactNode; className?: string }) {
  const onClick = async () => {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Feed address copied", { description: "Paste it into a feed reader such as Feedly or Inoreader." });
    } catch {
      toast.error("Couldn’t copy the feed address", { description: url });
    }
  };

  return (
    <Button variant="outline" onClick={onClick} className={cn("h-10 rounded-full px-4", className)}>
      <RssIcon aria-hidden />
      {children}
    </Button>
  );
}
