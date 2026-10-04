"use client";

import { useId, useRef, useState, type MouseEvent } from "react";
import Form from "next/form";
import { ArrowRight, Search, X } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { IconButton } from "@/components/ui/IconButton";
import { ROUTES } from "@/lib/constants";

/**
 * Search trigger + top panel. Submitting goes to /shop?q=…; the results
 * themselves arrive with the shop page.
 */
export function SearchOverlay() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogId = useId();
  const inputId = useId();

  function openSearch() {
    dialogRef.current?.showModal();
    inputRef.current?.focus();
    setOpen(true);
  }

  function closeSearch() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeSearch();
  }

  return (
    <>
      <IconButton
        label="Search products"
        icon={<Search />}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={openSearch}
      />

      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={titleId}
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeSearch(); } }}
        onCancel={(event) => { event.preventDefault(); closeSearch(); }}
        onClose={() => setOpen(false)}
        onClick={handleBackdropClick}
        className="sadira-dialog group m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-foreground"
      >
        <div className="-translate-y-4 border-b border-line bg-background opacity-0 transition duration-300 ease-soft group-open:translate-y-0 group-open:opacity-100 starting:group-open:-translate-y-4 starting:group-open:opacity-0">
          <Container className="pt-4 pb-10 md:pb-16">
            <div className="flex justify-end">
              <IconButton label="Close search" icon={<X />} onClick={closeSearch} className="-mr-2" />
            </div>

            <h2 id={titleId} className="text-center text-2xl md:text-4xl">
              Search Sadira
            </h2>

            <Form
              action={ROUTES.shop}
              role="search"
              onSubmit={closeSearch}
              className="mx-auto mt-6 flex max-w-2xl items-center gap-2 border-b border-foreground/25 transition-colors focus-within:border-primary-dark md:mt-10"
            >
              <Search aria-hidden="true" className="size-5 shrink-0 text-muted" />
              <label htmlFor={inputId} className="sr-only">
                Search products
              </label>
              <input
                ref={inputRef}
                id={inputId}
                type="search"
                name="q"
                required
                placeholder="Search products..."
                autoComplete="off"
                enterKeyHint="search"
                className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted focus-visible:outline-none md:text-lg"
              />
              <IconButton type="submit" label="Submit search" icon={<ArrowRight />} size="sm" />
            </Form>
          </Container>
        </div>
      </dialog>
    </>
  );
}
