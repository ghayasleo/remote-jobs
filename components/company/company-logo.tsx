"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-5 rounded-md text-[0.5625rem]",
  md: "size-11 rounded-xl text-base",
  lg: "size-16 rounded-2xl text-xl",
};
// The smallest tile has no room to spare around the mark.
const PADDING = { xs: "p-0", md: "p-1.5", lg: "p-1.5" };

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "?") + (words.length > 1 ? words[1][0] : "")).toUpperCase();
}

/** The company's favicon (via /logo/[domain]), or its initials when there isn't one. */
export function CompanyLogo({
  name,
  domain,
  size = "md",
  className,
}: {
  name: string;
  domain: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(!domain);
  const box = cn("shrink-0 border bg-background", SIZES[size], className);

  if (failed) {
    return (
      <span aria-hidden className={cn(box, "grid place-items-center bg-secondary font-bold text-secondary-foreground")}>
        {initials(name)}
      </span>
    );
  }
  return (
    // Logos are made for light backgrounds (many are dark marks on transparency),
    // so the tile stays white in dark mode too.
    <span className={cn(box, "grid place-items-center overflow-hidden bg-white dark:border-white/10", PADDING[size])}>
      <Image
        src={`/logo/${domain}`}
        alt=""
        width={64}
        height={64}
        unoptimized
        loading="lazy"
        className="size-full object-contain"
        onError={() => setFailed(true)}
        // The image can fail before React hydrates and attaches onError.
        ref={(img) => {
          if (img?.complete && img.naturalWidth === 0) setFailed(true);
        }}
      />
    </span>
  );
}
