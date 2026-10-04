import type { ComponentType, SVGProps } from "react";
import { MessageCircle } from "lucide-react";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/common/BrandIcons";
import { SOCIAL_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SocialLink {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const SOCIALS: SocialLink[] = [
  { label: "WhatsApp", href: SOCIAL_LINKS.whatsapp, icon: MessageCircle },
  { label: "Facebook", href: SOCIAL_LINKS.facebook, icon: FacebookIcon },
  { label: "Instagram", href: SOCIAL_LINKS.instagram, icon: InstagramIcon },
  { label: "TikTok", href: SOCIAL_LINKS.tiktok, icon: TikTokIcon },
];

export interface SocialLinksProps {
  className?: string;
}

/** WhatsApp, Facebook, Instagram and TikTok links (open in a new tab). */
export function SocialLinks({ className }: SocialLinksProps) {
  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {SOCIALS.map(({ label, href, icon: Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-full py-2 text-sm text-foreground transition-colors hover:text-primary-dark"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-blush text-primary-dark">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            {label}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
