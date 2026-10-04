/** Static placeholder matching ProductCard's layout, for loading states. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className="aspect-[3/4] rounded-xl bg-blush/70" />
      <div className="mt-3 h-2.5 w-16 rounded-full bg-blush md:mt-4" />
      <div className="mt-2.5 h-3.5 w-4/5 rounded-full bg-blush" />
      <div className="mt-2 h-3.5 w-3/5 rounded-full bg-blush" />
      <div className="mt-3 h-3.5 w-14 rounded-full bg-blush" />
    </div>
  );
}
