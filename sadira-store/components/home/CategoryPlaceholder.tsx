/**
 * Visual for a category that has no products yet. Decorative only: the card
 * caption carries the category name and "Collection Coming Soon".
 */
export function CategoryPlaceholder() {
  return (
    <div aria-hidden="true" className="absolute inset-0 bg-blush">
      {/* Fine inset frame */}
      <div className="absolute inset-3 rounded-xl border border-primary/50 md:inset-4" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="h-px w-10 bg-primary-dark" />
        <span className="font-serif text-2xl text-foreground italic md:text-3xl lg:text-4xl">
          Coming Soon
        </span>
        <span className="text-[0.625rem] tracking-[0.3em] text-foreground/70 uppercase md:text-xs">
          Sadira
        </span>
      </div>
    </div>
  );
}
