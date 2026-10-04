import type { Metadata } from "next";
import { ASSET_PATHS, SITE } from "@/lib/constants";
/** Server page metadata using the existing, unmodified brand image. */
export function publicMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: { canonical: path }, openGraph: { type: "website", title: `${title} | ${SITE.name}`, description, url: path, siteName: SITE.name, locale: SITE.locale, images: [{ url: ASSET_PATHS.logo, width: 2000, height: 2000, alt: `${SITE.name} logo` }] } };
}
