import { InfoPage } from "@/components/public/InfoPage";
import { ContactForm } from "@/components/public/ContactForm";
import { SocialLinks } from "@/components/common/SocialLinks";
import { CONTACT, ROUTES } from "@/lib/constants";
import { publicMetadata } from "@/lib/publicMetadata";
export const metadata = publicMetadata("Contact Sadira", "Contact Sadira through WhatsApp, Facebook or Instagram for product and order assistance.", ROUTES.contact);
export default function ContactPage() {
  return <InfoPage title="Contact Sadira" intro="A question about a style, a size or your order? We’re here to help." wide><div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16"><section className="min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-8"><h2 className="text-2xl">Leave a message</h2><ContactForm /></section><aside className="rounded-2xl border border-line bg-blush/25 p-6 sm:p-8"><h2 className="text-2xl">Let’s connect</h2><p className="mt-4 text-sm leading-relaxed text-muted">For assistance, contact Sadira through these official channels. If your question is about an order, have your Order ID ready.</p><p className="mt-5 text-sm">WhatsApp: <span className="whitespace-nowrap">{CONTACT.whatsapp}</span></p><SocialLinks className="mt-5" /><p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-muted">These links open a new tab. Messages sent through social platforms are handled on those platforms.</p></aside></div></InfoPage>;
}
