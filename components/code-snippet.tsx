"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A command or config file to paste somewhere, with a button that copies it. */
export function CodeSnippet({ code, what, className }: { code: string; what: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      toast.error(`Couldn’t copy the ${what}`, { description: "Select the text and copy it instead." });
    }
  };

  return (
    // The button sits beside the code, not over it, so long lines scroll clear of it.
    <div className={cn("flex items-start rounded-xl border bg-muted/60", className)}>
      <pre className="min-w-0 flex-1 overflow-x-auto py-3 pr-2 pl-4 font-mono text-[0.8125rem] leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={onCopy}
        aria-label={`Copy the ${what}`}
        className="m-1.5 shrink-0 rounded-lg text-muted-foreground hover:bg-background"
      >
        {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? `${what[0].toUpperCase()}${what.slice(1)} copied` : ""}
      </span>
    </div>
  );
}
