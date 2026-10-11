const PHRASES = ["Pretty", "Modest", "Powerful", "Modesty Elevates You", "Everyday Elegance", "Modesty Looks Good On You"];

/** Slow brand-line ticker between the hero and the first product row. Decorative only. */
export function BrandMarquee() {
  const row = PHRASES.map((phrase) => (
    <span key={phrase} className="flex shrink-0 items-center gap-8 pr-8 md:gap-12 md:pr-12">
      <span>{phrase}</span>
      <span aria-hidden="true" className="h-px w-8 bg-primary/60" />
    </span>
  ));

  return (
    <div aria-hidden="true" className="brand-marquee">
      <div className="marquee-track">
        <div className="flex shrink-0">{row}</div>
        <div className="flex shrink-0">{row}</div>
      </div>
    </div>
  );
}
