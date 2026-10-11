import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import collectionImage from "@/public/catalog/abaya/sad-abaya-001/1.jpeg";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/common/Breadcrumbs";
import { EmptyState } from "@/components/common/EmptyState";
import { Container } from "@/components/layout/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { ActiveFilterChips } from "@/components/shop/ActiveFilterChips";
import { DesktopShopFilters } from "@/components/shop/DesktopShopFilters";
import { MobileShopFilters } from "@/components/shop/MobileShopFilters";
import { SortSelect } from "@/components/shop/SortSelect";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";
import { countActiveFilters, pluralizeProducts, toShopUrl, type ShopQuery } from "@/lib/shopFilters";
import { getShopData, type ShopFilterOptions } from "@/services/productService";

const DEFAULT_DESCRIPTION =
  "Shop Sadira's Abaya, Niqab, Scarf and fashion accessories collection in Bangladesh.";

/** Grid: 2 cols mobile, 3 tablet, 2 beside the sidebar at lg, 3 at xl+. */
const GRID_IMAGE_SIZES =
  "(min-width: 1440px) 340px, (min-width: 1280px) 27vw, (min-width: 1024px) 34vw, (min-width: 768px) 30vw, 46vw";

/** Name of the selected category or group, if any. */
function collectionName(query: ShopQuery, options: ShopFilterOptions): string | null {
  if (query.category) return options.categories.find((c) => c.slug === query.category)?.name ?? null;
  if (query.group) return options.groups.find((g) => g.slug === query.group)?.name ?? null;
  return null;
}

export async function generateMetadata(props: PageProps<"/shop">): Promise<Metadata> {
  const { query, options } = await getShopData(await props.searchParams);
  const collection = collectionName(query, options);
  const title = query.q ? "Search Results" : collection ? `${collection} Collection` : "Shop Modest Fashion";
  return { title, description: DEFAULT_DESCRIPTION, alternates: { canonical: ROUTES.shop } };
}

export default async function ShopPage(props: PageProps<"/shop">) {
  const { query, products, candidates, options, collectionTotal } = await getShopData(await props.searchParams);
  const collection = collectionName(query, options);

  const heading = query.q ? "Search Results" : (collection ?? "Shop");
  const intro = query.q
    ? `Results for “${query.q}”`
    : "Explore modest fashion and accessories selected for everyday elegance.";

  const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: ROUTES.home }];
  const current = query.q ? "Search" : collection;
  breadcrumbs.push(current ? { label: "Shop", href: ROUTES.shop } : { label: "Shop" });
  if (current) breadcrumbs.push({ label: current });

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <Container className="pt-6 pb-16 md:pt-8 md:pb-24">
        <Breadcrumbs items={breadcrumbs} />

        <header className="collection-banner mt-6 md:mt-8">
          <div className="relative z-10 max-w-xl">
          <p className="flex items-center gap-3 text-xs font-medium tracking-[0.28em] text-foreground uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-primary-dark" />
            Sadira Collection
          </p>
          <h1 className="mt-4 text-4xl text-foreground md:text-5xl">{heading}</h1>
          <p className="mt-3 text-sm text-muted md:text-base">{intro}</p>
          <p className="mt-6 flex items-center gap-3 text-[0.625rem] font-medium tracking-[0.18em] text-primary-dark uppercase"><span className="h-px w-7 bg-primary-dark/40" /> Modest by nature. Yours by choice.</p>
          </div>
          <div aria-hidden="true" className="collection-art">
            <span className="collection-orbit" />
            <div className="collection-portrait"><Image src={collectionImage} alt="" sizes="240px" className="h-full w-full object-cover" /></div>
            <span className="collection-note">The Sadira edit <ArrowUpRight className="size-4" /></span>
          </div>
        </header>

        <nav aria-label="Browse collections" className="collection-shortcuts mt-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { name: "All pieces", href: ROUTES.shop, active: !query.category && !query.group && !query.q },
            ...options.categories.filter(category => ["abaya", "scarf", "niqab", "combo"].includes(category.slug)).map(category => ({ name: category.name, href: ROUTES.shopCategory(category.slug), active: query.category === category.slug })),
            { name: "Accessories", href: "/shop?group=accessories", active: query.group === "accessories" },
          ].map(item => <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} className="collection-chip">{item.name}</Link>)}
        </nav>

        <div className="mt-8 md:mt-12 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-14">
          <DesktopShopFilters
            query={query}
            options={options}
            candidates={candidates}
            className="filter-surface hidden lg:sticky lg:top-28 lg:block lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto"
          />

          <div className="min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-4">
                <div className="lg:hidden">
                  <MobileShopFilters query={query} options={options} candidates={candidates} />
                </div>
                <p aria-live="polite" className="hidden text-sm text-muted sm:block">
                  {pluralizeProducts(products.length)}
                </p>
              </div>
              <SortSelect query={query} />
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:hidden">
              <p aria-live="polite" className="text-sm text-muted">
                {pluralizeProducts(products.length)}
              </p>
            </div>

            <div className="mt-4 empty:hidden">
              <ActiveFilterChips query={query} options={options} />
            </div>

            <ShopResults
              query={query}
              collection={collection}
              collectionTotal={collectionTotal}
              productCount={products.length}
            >
              <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-2 lg:gap-x-6 xl:grid-cols-3">
                {products.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} imageSizes={GRID_IMAGE_SIZES} />
                  </li>
                ))}
              </ul>
            </ShopResults>
          </div>
        </div>
      </Container>
    </main>
  );
}

interface ShopResultsProps {
  query: ShopQuery;
  collection: string | null;
  collectionTotal: number;
  productCount: number;
  children: React.ReactNode;
}

/** The grid, or the right empty state: empty collection → no search results → no filter matches. */
function ShopResults({ query, collection, collectionTotal, productCount, children }: ShopResultsProps) {
  if (productCount > 0) return <section aria-labelledby="shop-products-heading"><h2 id="shop-products-heading" className="sr-only">Products</h2>{children}</section>;

  if (collection && collectionTotal === 0) {
    return (
      <EmptyState
        className="mt-6"
        title={`${collection} Collection Coming Soon`}
        description="We're preparing new styles for this collection."
        action={<ButtonLink href={ROUTES.shop}>Explore Other Products</ButtonLink>}
      />
    );
  }

  if (query.q && countActiveFilters(query) === 0) {
    return (
      <EmptyState
        className="mt-6"
        title={`No products found for “${query.q}”.`}
        description="Check the spelling or browse the full collection."
        action={<ButtonLink href={ROUTES.shop}>View All Products</ButtonLink>}
      />
    );
  }

  return (
    <EmptyState
      className="mt-6"
      title="No products match your filters."
      action={<ButtonLink href={toShopUrl({ q: query.q, sort: query.sort })}>Clear Filters</ButtonLink>}
    />
  );
}
