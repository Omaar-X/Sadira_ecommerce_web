"use client";
import { useId, useState, useSyncExternalStore, type FormEvent } from "react";
import { hydrationStore } from "@/lib/cartStore";
export function NewsletterForm() {
  const hydrated = useSyncExternalStore(hydrationStore.subscribe, hydrationStore.getSnapshot, hydrationStore.getServerSnapshot);
  const id = useId(); const [message, setMessage] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setMessage("Newsletter signup is coming soon."); }
  return <form onSubmit={submit} className="mt-5" aria-label="Newsletter signup"><label htmlFor={id} className="text-xs text-white/80">Email address</label><div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row xl:flex-col"><input id={id} name="email" type="email" autoComplete="email" placeholder="Your email address" required maxLength={254} className="h-12 min-w-0 flex-none sm:flex-1 xl:flex-none rounded-lg border border-white/30 bg-transparent px-3 text-base text-white placeholder:text-white/55 focus-visible:outline-white" /><button type="submit" disabled={!hydrated} className="min-h-12 rounded-lg bg-blush px-5 text-sm font-medium text-foreground transition-colors hover:bg-white focus-visible:outline-white">Subscribe</button></div><p className="mt-3 text-xs leading-relaxed text-white/70">Signup is not connected yet. Your email is not saved.</p><p role="status" className="mt-2 text-sm leading-relaxed text-blush">{message}</p></form>;
}
