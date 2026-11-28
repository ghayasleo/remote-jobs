"use client";

import { createContext, useContext, useId, useLayoutEffect, useRef } from "react";
import { ArrowDownIcon, ArrowUpIcon, CircleAlertIcon, LightbulbIcon, Trash2Icon } from "lucide-react";
import type { Suggestion } from "@/lib/cv-maker/suggestions";
import { cn } from "@/lib/utils";

/** The current suggestions, by what they're about, so any field can show its own. */
export const SuggestionsContext = createContext<Map<string, Suggestion[]>>(new Map());

export const fieldId = (target: string) => `cv-${target.replace(/[^a-z0-9-]/gi, "-")}`;

/** The suggestions for one thing in the CV, shown right under it. */
export function Hints({ target, className }: { target: string; className?: string }) {
  const hints = useContext(SuggestionsContext).get(target);
  if (!hints?.length) return null;
  return (
    <ul className={cn("mt-1.5 grid gap-1", className)}>
      {hints.map((hint) => (
        <li key={hint.id} className="flex gap-1.5 text-xs leading-snug">
          {hint.level === "fix" ? (
            <CircleAlertIcon className="mt-px size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Fix" />
          ) : (
            <LightbulbIcon className="mt-px size-3.5 shrink-0 text-muted-foreground" aria-label="Tip" />
          )}
          <span>
            <span className="font-medium text-foreground">{hint.title}.</span>{" "}
            <span className="text-muted-foreground">{hint.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const control =
  "w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  target,
  type = "text",
  className,
  autoComplete = "off",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  target?: string;
  type?: "text" | "email" | "tel" | "url";
  className?: string;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className={cn("min-w-0", className)} id={target ? fieldId(target) : undefined}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className={cn(control, "h-9")}
      />
      {target && <Hints target={target} />}
    </div>
  );
}

/** A text area that grows with what's typed. */
export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  target,
  rows = 2,
  className,
  hideLabel = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  target?: string;
  rows?: number;
  className?: string;
  hideLabel?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + 2}px`;
  }, [value]);
  return (
    <div className={cn("min-w-0", className)} id={target ? fieldId(target) : undefined}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1 block text-xs font-medium text-muted-foreground"}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(control, "resize-none leading-relaxed")}
      />
      {target && <Hints target={target} />}
    </div>
  );
}

/** Move up, move down and remove, for anything in a list. */
export function RowActions({
  label,
  onUp,
  onDown,
  onRemove,
  className,
}: {
  label: string;
  onUp?: () => void;
  onDown?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  const button =
    "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className={cn("flex shrink-0 items-center", className)}>
      <button type="button" className={button} onClick={onUp} disabled={!onUp} aria-label={`Move ${label} up`}>
        <ArrowUpIcon className="size-4" aria-hidden />
      </button>
      <button type="button" className={button} onClick={onDown} disabled={!onDown} aria-label={`Move ${label} down`}>
        <ArrowDownIcon className="size-4" aria-hidden />
      </button>
      {onRemove && (
        <button type="button" className={cn(button, "hover:text-destructive")} onClick={onRemove} aria-label={`Remove ${label}`}>
          <Trash2Icon className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Moves an item in a list by one place; out-of-range moves do nothing. */
export function move<T>(list: T[], index: number, by: -1 | 1) {
  const to = index + by;
  if (to < 0 || to >= list.length) return;
  const [item] = list.splice(index, 1);
  list.splice(to, 0, item);
}
