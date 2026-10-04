"use client";
import { useId, useState, useSyncExternalStore, type FormEvent } from "react";
import { hydrationStore } from "@/lib/cartStore";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import { normalizeBangladeshiPhone } from "@/lib/phone";
type Field = "name" | "phone" | "email" | "subject" | "message";
export function ContactForm() {
  const hydrated = useSyncExternalStore(hydrationStore.subscribe, hydrationStore.getSnapshot, hydrationStore.getServerSnapshot);
  const prefix = useId(); const [errors, setErrors] = useState<Partial<Record<Field, string>>>({}); const [notice, setNotice] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const values = Object.fromEntries(data) as Record<Field, string>; const next: Partial<Record<Field, string>> = {};
    if (values.name.trim().length < 2 || values.name.length > 80) next.name = "Enter your name (2–80 characters).";
    if (values.phone && !normalizeBangladeshiPhone(values.phone)) next.phone = "Enter a valid Bangladeshi phone number.";
    if (values.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.length > 254)) next.email = "Enter a valid email address.";
    if (values.subject.trim().length < 3 || values.subject.length > 120) next.subject = "Enter a subject (3–120 characters).";
    if (values.message.trim().length < 10 || values.message.length > 2000) next.message = "Enter a message (10–2,000 characters).";
    setErrors(next); setNotice("");
    const first = Object.keys(next)[0] as Field | undefined;
    if (first) { (form.elements.namedItem(first) as HTMLElement)?.focus(); return; }
    setNotice("Contact form submission is being connected. Please contact us through WhatsApp, Facebook or Instagram.");
  }
  const field = (name: Field) => ({ id: `${prefix}-${name}`, name, error: errors[name] });
  return <form onSubmit={submit} noValidate className="mt-7 grid gap-5" aria-label="Contact form"><p className="rounded-xl border border-line bg-blush/25 px-4 py-3 text-sm leading-relaxed text-muted">This form is not connected yet. Your message will not be sent or saved. Our official contact channels are listed on this page.</p><TextField {...field("name")} label="Name" autoComplete="name" required maxLength={80} /><div className="grid gap-5 sm:grid-cols-2"><TextField {...field("phone")} label="Phone" optional type="tel" inputMode="tel" autoComplete="tel" maxLength={20} /><TextField {...field("email")} label="Email" optional type="email" autoComplete="email" maxLength={254} /></div><TextField {...field("subject")} label="Subject" required maxLength={120} /><TextAreaField {...field("message")} label="Message" required minLength={10} maxLength={2000} rows={5} /><Button type="submit" disabled={!hydrated} className="justify-self-start">Submit</Button><p role="status" className="text-sm leading-relaxed text-foreground">{notice}</p></form>;
}
