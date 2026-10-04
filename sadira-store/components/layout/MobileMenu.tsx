"use client";

import { useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { SocialLinks } from "@/components/common/SocialLinks";
import { MobileNav } from "@/components/layout/MobileNav";
import { IconButton } from "@/components/ui/IconButton";

export interface MobileMenuProps {
  /** The brand logo, rendered on the server and passed in. */
  logo: ReactNode;
}

/**
 * Left slide-out drawer built on the native modal <dialog>, which provides
 * focus trapping, Escape to close and an inert page behind it.
 */
export function MobileMenu({ logo }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogId = useId();

  function openMenu() {
    dialogRef.current?.showModal();
    setOpen(true);
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  // Close on backdrop clicks (the dialog element itself) and on any link click.
  function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.closest("a")) closeMenu();
  }

  return (
    <>
      <IconButton
        label="Open menu"
        icon={<Menu />}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={openMenu}
        className="-ml-2"
      />

      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={titleId}
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeMenu(); } }}
        onCancel={(event) => { event.preventDefault(); closeMenu(); }}
        onClose={() => setOpen(false)}
        onClick={handleDialogClick}
        className="sadira-dialog group m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-foreground"
      >
        <div className="flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-background transition-transform duration-300 ease-soft -translate-x-full group-open:translate-x-0 starting:group-open:-translate-x-full">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
            <h2 id={titleId} className="sr-only">
              Menu
            </h2>
            {logo}
            <IconButton label="Close menu" icon={<X />} onClick={closeMenu} className="-mr-2" />
          </div>

          <div className="flex flex-1 flex-col px-4 py-6">
            <MobileNav />

            <div className="mt-6 border-t border-line pt-6">
              <p className="mb-2 text-[0.6875rem] tracking-[0.2em] text-muted uppercase">
                Connect with us
              </p>
              <SocialLinks />
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
