import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { Container } from "@/components/layout/Container";
import { ROUTES } from "@/lib/constants";
import { getDeliveryCharges, getOrderingStatus } from "@/lib/delivery";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

/** `/checkout` = the bag; `/checkout?mode=buy-now` = the single Buy Now item. */
export default async function CheckoutPage(props: PageProps<"/checkout">) {
  const { mode } = await props.searchParams;

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <Container className="pt-6 pb-16 md:pt-8 md:pb-24">
        <Breadcrumbs items={[{ label: "Home", href: ROUTES.home }, { label: "Checkout" }]} />
        <h1 className="mt-6 text-3xl text-foreground md:mt-8 md:text-4xl">Checkout</h1>
        <p className="mt-2 text-sm text-muted md:text-base">Complete your details to review your order.</p>
        {/* Server-side config → display values only; /api/orders recalculates everything. */}
        <CheckoutView
          mode={mode === "buy-now" ? "buy-now" : "cart"}
          deliveryCharges={getDeliveryCharges()}
          ordering={getOrderingStatus()}
        />
      </Container>
    </main>
  );
}
