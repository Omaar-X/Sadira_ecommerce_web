"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky <header> that gains a faint shadow once it is stuck to the top.
 * A zero-height sentinel above the header tells us when that happens.
 */
export function StickyHeader({ children }: { children: ReactNode }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-line bg-white transition-shadow duration-300",
          stuck && "shadow-[0_2px_16px_rgb(23_23_23/0.05)]",
        )}
      >
        {children}
      </header>
    </>
  );
}
