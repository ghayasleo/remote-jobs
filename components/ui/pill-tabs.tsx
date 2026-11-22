"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// Tabs drawn as the site's filter chips: one row that scrolls sideways on
// phones, like the filter chips, and wraps on wider screens.

function PillTabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="pill-tabs" className={cn("flex flex-col gap-4", className)} {...props} />;
}

function PillTabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="pill-tabs-list"
      // The vertical padding leaves room for the focus ring, which the
      // scrolling row would otherwise clip.
      className={cn("-my-1 flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible", className)}
      {...props}
    />
  );
}

function PillTabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="pill-tabs-trigger"
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border bg-background px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none select-none has-[img,svg]:pl-2.5",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=inactive]:hover:bg-muted",
        "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}

function PillTabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="pill-tabs-content"
      // Every panel is in the HTML, for search engines and before scripts
      // load; only the chosen one shows.
      forceMount
      className={cn(
        "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=inactive]:hidden",
        "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-200 data-[state=active]:ease-out-quart motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { PillTabs, PillTabsList, PillTabsTrigger, PillTabsContent };
