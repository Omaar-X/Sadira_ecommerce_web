import { InfoPage } from "@/components/public/InfoPage";
import { ButtonLink } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";
import { publicMetadata } from "@/lib/publicMetadata";
export const metadata = publicMetadata("Return & Exchange", "Contact Sadira about return or exchange availability for your product and order.", ROUTES.returnExchange);
export default function ReturnExchangePage() {
  return <InfoPage title="Return & Exchange" intro="Please speak with us before returning an item."><h2>Let’s review your order</h2><p>Exchange availability and conditions may depend on the product and order situation. Please contact Sadira before returning any item.</p><p>When you contact us, share your Order ID, the product involved and a short description of the issue or request. Sadira can then discuss the relevant next steps with you.</p><h2>Confirm the next steps first</h2><p>No fixed return or exchange period, refund guarantee or courier-fee rule is published here. Please ask Sadira about the conditions that apply to your situation before arranging a return.</p><ButtonLink href={ROUTES.contact} className="mt-7">Contact Sadira</ButtonLink></InfoPage>;
}
