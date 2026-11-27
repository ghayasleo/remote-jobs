"use client";

import { useState } from "react";
import { toast } from "sonner";

const LABELS = { new: "New", added: "Added", "not-a-fit": "Not a fit" } as const;

export function SuggestionStatus({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status);
  return (
    <label className="inline-flex">
      <span className="sr-only">Status</span>
      <select
        value={value}
        onChange={async (event) => {
          const next = event.target.value;
          setValue(next);
          const response = await fetch("/api/admin/suggestions", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, status: next }),
          }).catch(() => null);
          if (!response?.ok) {
            setValue(status);
            toast.error("Couldn't update the status.");
          }
        }}
        className="h-9 rounded-full border bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {Object.entries(LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
