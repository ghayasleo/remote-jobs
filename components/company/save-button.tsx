"use client";

import { BookmarkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleSaved, useIsSaved } from "@/lib/saved";
import { cn } from "@/lib/utils";

export function SaveButton({
  slug,
  name,
  withLabel = false,
  className,
}: {
  slug: string;
  name: string;
  withLabel?: boolean;
  className?: string;
}) {
  const saved = useIsSaved(slug);

  const onClick = () => {
    const nowSaved = toggleSaved(slug);
    toast(nowSaved ? `Saved ${name}` : `Removed ${name} from saved`, {
      id: `saved-${slug}`,
      action: { label: "Undo", onClick: () => toggleSaved(slug) },
    });
  };

  const icon = (
    <BookmarkIcon
      className={cn("size-5 transition-transform duration-200 ease-out-quart", saved && "scale-110 fill-current")}
      aria-hidden
    />
  );

  if (withLabel) {
    return (
      <Button
        variant={saved ? "secondary" : "outline"}
        size="lg"
        aria-pressed={saved}
        onClick={onClick}
        className={cn("h-11 rounded-full px-4", className)}
      >
        {icon}
        {saved ? "Saved" : "Save"}
      </Button>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={onClick}
      className={cn("size-11 rounded-full", saved ? "text-primary" : "text-muted-foreground", className)}
    >
      {icon}
    </Button>
  );
}
