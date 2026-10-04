import { CategorySection } from "@/components/home/CategorySection";
import { HeroSection } from "@/components/home/HeroSection";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
import { OffersSection } from "@/components/home/OffersSection";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <HeroSection />
      <OffersSection />
      <CategorySection />
      <NewArrivalsSection />
    </main>
  );
}
