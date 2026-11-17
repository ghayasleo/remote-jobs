"use client";

import { Share2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareButton({ name, withLabel = false, className }: { name: string; withLabel?: boolean; className?: string }) {
  const onClick = async () => {
    const url = window.location.href.split("#")[0];
    const data = { title: `${name} · Remote Jobs`, text: `${name} hires remotely.`, url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
      } catch {
        // Closing the share sheet isn't an error worth reporting.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn’t copy the link. Copy it from the address bar instead.");
    }
  };

  return withLabel ? (
    <Button variant="outline" size="lg" onClick={onClick} className={cn("h-11 rounded-full px-4", className)}>
      <Share2Icon className="size-5" aria-hidden /> Share
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={`Share ${name}`}
      className={cn("size-11 rounded-full", className)}
    >
      <Share2Icon className="size-5" aria-hidden />
    </Button>
  );
}
