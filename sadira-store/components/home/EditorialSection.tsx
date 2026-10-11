import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import comboImage from "@/public/catalog/combo/sad-combo-002/1.jpeg";
import { Container } from "@/components/layout/Container";
import { Tilt } from "@/components/ui/Tilt";
import { ROUTES } from "@/lib/constants";

/** Editorial "complete look" band: a combo photo beside a short brand line, in the blush palette. */
export function EditorialSection() {
  return (
    <section aria-labelledby="editorial-heading" className="py-14 md:py-20 lg:py-24">
      <Container>
        <div className="editorial-surface grid items-center gap-8 overflow-hidden rounded-[1.5rem] bg-blush md:grid-cols-2 md:gap-12 lg:rounded-[2.5rem] lg:gap-20">
          <Tilt className="relative p-5 pb-0 md:p-8 md:pr-0" max={5}>
            <span aria-hidden="true" className="editorial-arch-back" />
            <div className="editorial-arch depth-photo relative aspect-[4/5] overflow-hidden md:aspect-auto md:min-h-[520px] md:h-full">
              <Image
                src={comboImage}
                alt="An abaya styled with a leopard hijab, bag, niqab, perfume and sunflower clip"
                fill
                placeholder="blur"
                sizes="(min-width: 1440px) 680px, (min-width: 768px) 48vw, 94vw"
                className="object-cover"
              />
            </div>
          </Tilt>
          <div className="reveal px-6 pb-10 md:py-16 md:pr-12 lg:pr-20">
            <p className="flex items-center gap-3 text-xs font-medium tracking-[0.28em] text-foreground uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-primary-dark" />
              The Complete Look
            </p>
            <h2 id="editorial-heading" className="mt-5 text-heading text-foreground">
              A little harmony.
              <br />
              <span className="text-primary-dark italic">A whole new look.</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm text-muted md:text-base">
              From the abaya to the finishing touch, discover combinations that make getting dressed feel effortless.
            </p>
            <Link
              href={ROUTES.shopCategory("combo")}
              className="group mt-8 inline-flex items-center gap-2 border-b border-foreground/30 pb-1 text-sm font-medium text-foreground transition-colors hover:border-primary-dark hover:text-primary-dark"
            >
              Explore the combos
              <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
