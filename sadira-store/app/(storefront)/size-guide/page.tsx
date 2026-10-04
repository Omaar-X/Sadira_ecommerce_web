import Link from "next/link";
import { InfoPage } from "@/components/public/InfoPage";
import { ROUTES } from "@/lib/constants";
import { publicMetadata } from "@/lib/publicMetadata";
import { getProducts } from "@/services/productService";
export const metadata = publicMetadata("Size Guide", "Find product-specific size options from the Sadira catalog and ask for detailed measurements before ordering.", ROUTES.sizeGuide);
export default async function SizeGuidePage() {
  const products = (await getProducts()).filter(product => product.sizes.length > 0);
  return <InfoPage title="Size Guide" intro="A little care with sizing makes choosing your next style easier."><h2>Find your product’s size options</h2><p>Available sizes vary by product. Please check the size options shown on each product page.</p><p>The values below are size labels from the current catalog. They are not body measurements or a measurement chart.</p><div className="mt-7 grid gap-4">{products.map(product => <section key={product.id} className="rounded-xl border border-line bg-white p-5"><h3 className="text-xl"><Link href={ROUTES.product(product.slug)}>{product.name}</Link></h3><p className="mt-3 text-sm text-muted">Available size labels: <span className="text-foreground">{product.sizes.join(", ")}</span></p><Link href={ROUTES.product(product.slug)} className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Check product options</Link></section>)}</div><h2>Need detailed measurements?</h2><p>For detailed measurements, please contact Sadira before placing your order. Tell us which product you’re considering so we can help with the relevant information.</p><p>For styles without a size selector, please check the product details and contact Sadira with any sizing questions.</p></InfoPage>;
}
