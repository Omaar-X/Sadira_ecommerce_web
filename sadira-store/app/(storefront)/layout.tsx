import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
// Local catalog pages can be prerendered. Configured Sheets requests use
// cache: "no-store", which keeps live prices and stock request-time fresh.
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider><a href="#main-content" className="skip-link">Skip to content</a><Header />{children}<Footer /><CartDrawer /></CartProvider>;
}
