import { CategoryCard } from "@/components/home/CategoryCard";
import { HOME_CATEGORIES } from "@/components/home/categoryData";
import { Container } from "@/components/layout/Container";

/** Homepage "Shop by Category": Abaya, Burka, Niqab, Scarf and Accessories. */
export function CategorySection() {
  return (
    <section aria-labelledby="categories-heading" className="py-14 md:py-20 lg:py-24">
      <Container>
        <div className="max-w-xl">
          <p className="flex items-center gap-3 text-xs font-medium tracking-[0.28em] text-foreground uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-primary-dark" />
            Shop by Category
          </p>
          <h2 id="categories-heading" className="mt-4 text-heading text-foreground">
            Find Your Style
          </h2>
          <p className="mt-3 text-sm text-muted md:text-base">
            Explore Sadira’s modest fashion and accessories collection.
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:mt-12 md:gap-y-10 lg:grid-cols-6 lg:gap-x-6 lg:gap-y-12">
          {HOME_CATEGORIES.map((category) => (
            <CategoryCard key={category.href} category={category} />
          ))}
        </ul>
      </Container>
    </section>
  );
}
