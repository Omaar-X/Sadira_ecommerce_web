import Image from "next/image";

/** Default: 2 columns on mobile/tablet, 4 on desktop (homepage grid). */
export const DEFAULT_PRODUCT_IMAGE_SIZES = "(min-width: 1440px) 320px, (min-width: 1024px) 23vw, 46vw";

export interface ProductCardImageProps {
  name: string;
  images: string[];
  /** `sizes` for the grid the card sits in. */
  sizes?: string;
}

/**
 * Product photo in the card's 3:4 frame. With 2+ photos, the second fades in
 * on hover — only on devices that can hover, where it is also the only place
 * the second photo is loaded (it's display:none elsewhere, so lazy never fetches it).
 */
export function ProductCardImage({ name, images, sizes = DEFAULT_PRODUCT_IMAGE_SIZES }: ProductCardImageProps) {
  const [primary, secondary] = images;

  return (
    <>
      <Image src={primary} alt={name} fill sizes={sizes} className="object-cover" />
      {secondary && (
        <Image
          src={secondary}
          alt=""
          fill
          sizes={sizes}
          className="hidden object-cover opacity-0 transition-opacity duration-300 ease-soft group-hover:opacity-100 [@media(hover:hover)]:block"
        />
      )}
    </>
  );
}
