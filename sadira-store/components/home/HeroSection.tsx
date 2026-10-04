import Image from "next/image";
import { ArrowRight } from "lucide-react";
// Hero image: Abaya Elara (SAD-ABAYA-001), beige — catalog photo 1
// (source: ../Image/Abaya/Abaya 2.jpeg). Full-length, 3:4, shown uncropped.
import heroImage from "@/public/catalog/abaya/sad-abaya-001/1.jpeg";
import { HeroTrustPoints } from "@/components/home/HeroTrustPoints";
import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";

const HERO_IMAGE_ALT =
  "Full-length beige Abaya Elara with a gathered yoke and ruffled sleeve cuffs, worn with a patterned hijab";

/**
 * Homepage hero. Stacked on mobile (copy → image → trust points); two columns
 * from md, with the trust points under the copy and the image on the right.
 */
export function HeroSection() {
  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden py-10 md:py-14 lg:py-12 xl:py-14">
      <Container className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:grid-rows-[1fr_auto] md:gap-x-10 md:gap-y-8 lg:grid-cols-[minmax(0,44fr)_minmax(0,56fr)] lg:gap-x-16">
        {/* Copy */}
        <div className="md:col-start-1 md:row-start-1 md:self-end">
          <p className="flex items-center gap-3 text-xs font-medium tracking-[0.28em] text-foreground uppercase">
            <span aria-hidden="true" className="h-px w-8 bg-primary-dark" />
            Modesty Elevates You
          </p>

          <h1 id="hero-heading" className="mt-6 text-hero font-medium text-foreground">
            Pretty.
            <br />
            <span className="text-primary-dark">Modest.</span>
            <br />
            Powerful.
          </h1>

          <p className="mt-6 max-w-sm text-subheading text-muted">
            Thoughtfully selected modest wear for elegance, comfort and everyday confidence.
          </p>

          <ButtonLink
            href={ROUTES.shop}
            size="lg"
            icon={<ArrowRight aria-hidden="true" className="size-4" />}
            iconPosition="end"
            className="mt-8"
          >
            Shop Now
          </ButtonLink>
        </div>

        {/* Image */}
        <div className="md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
          {/* On wide screens the frame fills the column while the 3:4 photo stays ~640px tall. */}
          <div className="relative mx-auto w-full max-w-[520px] pb-[10%] md:mr-0 xl:max-w-[640px] xl:pb-[7%]">
            {/* Soft blush frame peeking out behind the photo (bottom-left). */}
            <div
              aria-hidden="true"
              className="absolute top-[14%] bottom-0 left-0 w-[72%] rounded-[2rem] bg-blush lg:rounded-[2.5rem] xl:top-[10%] xl:w-[70%]"
            />
            <div className="relative ml-auto w-[94%] overflow-hidden rounded-[1.5rem] lg:rounded-[2rem] xl:w-[75%]">
              <Image
                src={heroImage}
                alt={HERO_IMAGE_ALT}
                preload
                placeholder="blur"
                sizes="(min-width: 1280px) 480px, (min-width: 1024px) 46vw, (min-width: 768px) 44vw, 94vw"
                className="h-auto w-full"
              />
            </div>
            {/* Sits in the space under the photo so it doesn't cover the garment. */}
            <p className="absolute bottom-0 left-[4%] rounded-full border border-line bg-white px-4 py-2.5 font-serif text-sm text-foreground italic shadow-[0_4px_20px_rgb(23_23_23/0.06)] sm:left-[6%] sm:px-5 sm:text-base">
              Modesty Looks Good On You
            </p>
          </div>
        </div>

        {/* Trust points */}
        <HeroTrustPoints className="md:col-start-1 md:row-start-2 md:self-start" />
      </Container>
    </section>
  );
}
