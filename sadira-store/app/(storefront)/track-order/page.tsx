import { Container } from "@/components/layout/Container";
import { OrderTracking } from "@/components/checkout/OrderTracking";
export const metadata = { title: "Track your order", robots: { index: false, follow: false } };
export default function TrackOrderPage() { return <main id="main-content" tabIndex={-1} className="flex-1 py-10 md:py-16"><Container><OrderTracking /></Container></main>; }
