import { CartButton } from "@/components/cart/CartButton";
import { Logo } from "@/components/common/Logo";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Container } from "@/components/layout/Container";
import { DesktopNav } from "@/components/layout/DesktopNav";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { StickyHeader } from "@/components/layout/StickyHeader";

function HeaderActions() {
  return (
    <div className="flex items-center justify-end gap-0.5 lg:gap-1">
      <SearchOverlay />
      <CartButton className="-mr-2 lg:mr-0" />
    </div>
  );
}

/**
 * Site header. Mobile: menu | centred logo | search + bag.
 * Desktop (lg+): logo | navigation | search and bag.
 */
export function Header() {
  return (
    <>
      <AnnouncementBar />
      <StickyHeader>
        <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 xl:h-20 xl:grid-cols-[auto_1fr_auto] xl:gap-6">
          <div className="flex items-center xl:hidden">
            <MobileMenu logo={<Logo />} />
          </div>
          <Logo />
          <DesktopNav className="hidden justify-center xl:flex" />
          <HeaderActions />
        </Container>
      </StickyHeader>
    </>
  );
}
