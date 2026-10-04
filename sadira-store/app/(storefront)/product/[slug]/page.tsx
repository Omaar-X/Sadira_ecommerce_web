import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { ProductDetails, hasProductDetails } from "@/components/product/ProductDetails";
import { ProductPolicyNotes } from "@/components/product/ProductPolicyNotes";
import { ProductView } from "@/components/product/ProductView";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { ROUTES } from "@/lib/constants";
import { toPublicProduct } from "@/lib/productDisplay";
import { getProductBySlug, getRelatedProducts } from "@/services/productService";

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max - 1)).replace(/[\s,.;:—-]+$/, "")}…`;
}

export async function generateMetadata(props: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };

  const description = product.description
    ? truncateAtWord(product.description, 160)
    : `${product.name} — ${product.category} from Sadira.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: ROUTES.product(product.slug) },
    openGraph: {
      title: product.name,
      description,
      url: ROUTES.product(product.slug),
      images: product.images.slice(0, 1).map((url) => ({ url, alt: product.name })),
    },
  };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product, 4);

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <Container className="pt-6 pb-16 md:pt-8 md:pb-24">
        <Breadcrumbs
          items={[
            { label: "Home", href: ROUTES.home },
            { label: "Shop", href: ROUTES.shop },
            { label: product.category, href: ROUTES.shopCategory(product.categorySlug) },
            { label: product.name },
          ]}
        />

        <div className="mt-6 md:mt-8">
          {/* Only public fields go to the browser (no internal catalog data). */}
          <ProductView
            product={toPublicProduct(product)}
            videoSrc={product.id === "SAD-ABAYA-005" ? "/catalog/abaya/sad-abaya-005/shirt-abaya.mp4" : undefined}
          />
        </div>

        <div className="mt-16 grid gap-12 md:mt-20 lg:grid-cols-[minmax(0,57fr)_minmax(0,43fr)] lg:gap-12 xl:gap-16">
          <div>{hasProductDetails(product) && <ProductDetails {...product} />}</div>
          <ProductPolicyNotes />
        </div>

        <div className="mt-16 md:mt-24">
          <RelatedProducts products={related} />
        </div>
      </Container>
    </main>
  );
}
