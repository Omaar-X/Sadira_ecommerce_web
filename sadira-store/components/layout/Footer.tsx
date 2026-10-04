import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/common/BrandIcons";
import { Container } from "@/components/layout/Container";
import { CONTACT, CUSTOMER_CARE_LINKS, POLICY_LINKS, ROUTES, SITE, SOCIAL_LINKS } from "@/lib/constants";

const quickLinks = [{ label: "Home", href: ROUTES.home }, { label: "Shop", href: ROUTES.shop }, { label: "About Us", href: ROUTES.about }];
const socials = [
  { label: "WhatsApp", href: SOCIAL_LINKS.whatsapp, Icon: MessageCircle },
  { label: "Facebook", href: SOCIAL_LINKS.facebook, Icon: FacebookIcon },
  { label: "Instagram", href: SOCIAL_LINKS.instagram, Icon: InstagramIcon },
  { label: "TikTok", href: SOCIAL_LINKS.tiktok, Icon: TikTokIcon },
];
const linkClass = "inline-flex min-h-11 items-center text-sm text-muted hover:text-primary-dark";

export function Footer() {
  const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date());
  return (
    <footer className="mt-auto border-t border-line bg-blush/40 text-foreground">
      <Container className="pt-6 pb-3 md:pt-8 md:pb-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-[1.3fr_.7fr_1fr_1.1fr] md:gap-8">
          <div className="col-span-2 flex items-center gap-4 md:col-span-1 md:block">
            <Link href={ROUTES.home} aria-label={`${SITE.name} — home`} className="inline-flex shrink-0">
              <Image src="/brand/logo-transparent.png" alt={`${SITE.name} by Sadia logo`} width={80} height={80} className="h-20 w-20 object-contain" />
            </Link>
            <p className="text-sm leading-relaxed text-muted md:mt-2">Modesty Today,<br />A Better Tomorrow ♡</p>
          </div>
          <nav aria-label="Footer quick links">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest">Explore</h2>
            <ul className="mt-2">{quickLinks.map(link => <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>)}</ul>
          </nav>
          <nav aria-label="Customer care">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest">Customer Care</h2>
            <ul className="mt-2">{CUSTOMER_CARE_LINKS.map(link => <li key={link.href}><Link href={link.href} className={linkClass}>{link.label}</Link></li>)}</ul>
          </nav>
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 md:col-span-1 md:block md:border-0 md:pt-0">
            <div><h2 className="font-sans text-xs font-semibold uppercase tracking-widest">Stay Connected</h2>
              <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>{CONTACT.whatsapp}</a>
            </div>
            <div className="flex items-center md:mt-1">{socials.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex h-11 w-11 items-center justify-center text-muted hover:text-primary-dark"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></a>)}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-5 border-t border-line pt-2 text-xs text-muted md:mt-6">
          <p>© {year} {SITE.name}. All rights reserved.</p>
          <nav aria-label="Footer policies" className="flex flex-wrap gap-x-5">{POLICY_LINKS.map(link => <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center hover:text-primary-dark">{link.label}</Link>)}</nav>
        </div>
      </Container>
    </footer>
  );
}
