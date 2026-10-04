import { textLang } from "@/lib/productDisplay";
import type { PublicProduct } from "@/types/product";

type ProductDetailsProps = Pick<PublicProduct, "description" | "features" | "details">;

export function hasProductDetails({ description, features, details }: ProductDetailsProps): boolean {
  return Boolean(description) || features.length > 0 || details.length > 0;
}

/** Description, features and labelled details — only real catalog values. */
export function ProductDetails({ description, features, details }: ProductDetailsProps) {
  return (
    <section aria-labelledby="product-details-heading">
      <h2 id="product-details-heading" className="text-2xl text-foreground md:text-3xl">
        Product Details
      </h2>

      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
        {(description || features.length > 0) && (
          <div className="space-y-5">
            {description && (
              <p lang={textLang(description)} className="leading-relaxed text-foreground/85">
                {description}
              </p>
            )}
            {features.length > 0 && (
              <ul className="space-y-2">
                {features.map((feature) => (
                  <li key={feature} lang={textLang(feature)} className="flex gap-3 text-sm text-foreground/85">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary-dark" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {details.length > 0 && (
          <dl className="divide-y divide-line border-y border-line">
            {details.map((detail) => (
              <div key={detail.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 text-sm">
                <dt className="text-muted">{detail.label}</dt>
                <dd lang={textLang(detail.value)} className="text-foreground">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
