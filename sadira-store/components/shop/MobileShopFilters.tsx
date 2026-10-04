"use client";

import { useId, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { ShopFilterPanel } from "@/components/shop/ShopFilterPanel";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import {
  EMPTY_FILTERS,
  countActiveFilters,
  filterProducts,
  pluralizeProducts,
  toShopUrl,
  type FilterableProduct,
  type ShopFilters,
  type ShopQuery,
} from "@/lib/shopFilters";
import type { ShopFilterOptions } from "@/services/productService";

export interface MobileShopFiltersProps {
  query: ShopQuery;
  options: ShopFilterOptions;
  candidates: FilterableProduct[];
}

function pickFilters(query: ShopQuery): ShopFilters {
  const { category, group, price, availability, size, color } = query;
  return { category, group, price, availability, size, color };
}

/**
 * "Filters" button + right-side drawer (native modal <dialog>, like the
 * mobile menu: focus trap, Escape to close, page scroll locked). Selections
 * are a draft until "Show X Products" applies them to the URL.
 */
export function MobileShopFilters({ query, options, candidates }: MobileShopFiltersProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShopFilters>(() => pickFilters(query));
  const titleId = useId();
  const dialogId = useId();

  const activeCount = countActiveFilters(pickFilters(query));
  const draftResults = filterProducts(candidates, draft).length;

  function openDrawer() {
    setDraft(pickFilters(query));
    dialogRef.current?.showModal();
    setOpen(true);
  }

  function closeDrawer() {
    dialogRef.current?.close();
  }

  function apply() {
    router.push(toShopUrl({ ...draft, q: query.q, sort: query.sort }), { scroll: false });
    closeDrawer();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeDrawer();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        icon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={openDrawer}
      >
        Filters
        {activeCount > 0 && (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[0.625rem] font-semibold text-foreground">
            {activeCount}
            <span className="sr-only"> active</span>
          </span>
        )}
      </Button>

      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={handleBackdropClick}
        className="sadira-dialog group m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-foreground"
      >
        <div className="ml-auto flex h-full w-[88%] max-w-sm translate-x-full flex-col bg-background transition-transform duration-300 ease-soft group-open:translate-x-0 starting:group-open:translate-x-full">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
            <h2 id={titleId} className="font-serif text-xl">
              Filters
            </h2>
            <IconButton label="Close filters" icon={<X />} onClick={closeDrawer} className="-mr-2" />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <ShopFilterPanel options={options} candidates={candidates} value={draft} onChange={setDraft} />
          </div>

          <div className="flex shrink-0 gap-3 border-t border-line px-5 py-4">
            <Button variant="outline" onClick={() => setDraft(EMPTY_FILTERS)} className="flex-1">
              Clear
            </Button>
            <Button onClick={apply} className="flex-[2]">
              Show {pluralizeProducts(draftResults)}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
