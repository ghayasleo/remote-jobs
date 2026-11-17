"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals a long list a page at a time: more appear as the sentinel element
 * scrolls near the viewport, or when its "Show more" button is pressed.
 */
export function useLoadMore(total: number, pageSize = 24) {
  const [limit, setLimit] = useState(pageSize);
  const sentinel = useRef<HTMLLIElement>(null);
  const hasMore = limit < total;

  useEffect(() => {
    const target = sentinel.current;
    if (!hasMore || !target || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLimit((current) => current + pageSize);
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, limit, pageSize]);

  return { limit, hasMore, sentinel, showMore: () => setLimit((current) => current + pageSize) };
}
