import type { Metadata } from "next";
import { OrderSuccessView } from "@/components/checkout/OrderSuccessView";
import { Container } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "Order Placed",
  robots: { index: false },
};

/** Order confirmation. Details come from the tab's sessionStorage — never from the URL. */
export default function OrderSuccessPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <Container className="pt-10 pb-16 md:pt-14 md:pb-24">
        <OrderSuccessView />
      </Container>
    </main>
  );
}
