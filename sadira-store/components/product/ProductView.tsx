"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Info } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useProductStock } from "@/components/inventory/useInventory";
import { ChipOptions, DesignOptions, OptionGroup } from "@/components/product/ProductOptions";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPrice } from "@/components/product/ProductPrice";
import { QuantitySelector } from "@/components/product/QuantitySelector";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { saveBuyNowItem } from "@/lib/buyNow";
import { createCartItem, maxOrderQuantity } from "@/lib/cart";
import { ROUTES } from "@/lib/constants";
import { getProductBadges, LOW_STOCK_THRESHOLD } from "@/lib/productDisplay";
import type { PublicProduct } from "@/types/product";

type PurchaseIntent = "add-to-cart" | "buy-now";

interface Notice {
  text: string;
  /** Show a "View Bag" link after the text. */
  viewBag?: boolean;
}

/** Auto-select when there's exactly one choice; otherwise the customer must pick. */
function onlyOption(options: string[]): string | null {
  return options.length === 1 ? options[0] : null;
}

function StockStatus({ stock, unavailable }: { stock: number | null; unavailable: boolean }) {
  if (unavailable) return <p className="text-sm font-medium text-muted">Currently Unavailable</p>;
  // Untracked stock: say nothing rather than guess.
  if (stock === null) return null;
  if (stock === 0) return <p className="text-sm font-medium text-muted">Out of Stock</p>;
  if (stock <= LOW_STOCK_THRESHOLD) {
    return <p className="text-sm font-medium text-primary-dark">Only {stock} left</p>;
  }
  return (
    <p className="flex items-center gap-1.5 text-sm text-foreground">
      <Check aria-hidden="true" className="size-4 text-primary-dark" />
      In Stock
    </p>
  );
}

/**
 * Gallery + purchase panel. They share state because choosing a design
 * (scarf) switches the photo, and picking a design's photo selects the design.
 */
export function ProductView({ product, videoSrc }: { product: PublicProduct; videoSrc?: string }) {
  const router = useRouter();
  const { addItem, openDrawer } = useCart();
  const quantityLabelId = useId();
  const [imageIndex, setImageIndex] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(true);
  const [size, setSize] = useState(() => onlyOption(product.sizes));
  const [color, setColor] = useState(() => onlyOption(product.colors));
  // The gallery opens on design 1's photo, so design 1 starts selected (clearly shown).
  const [designId, setDesignId] = useState<string | null>(() => product.designs[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Live inventory (Google Sheets) when available; the catalog stock until then / without it.
  const live = useProductStock(product.id, product.stock);
  const outOfStock = live.stock === 0;
  const canPurchase = !outOfStock && !live.unavailable && product.price !== null;
  const maxQuantity = Math.max(1, maxOrderQuantity(product, live));
  // Live stock may drop below the chosen quantity after it was picked.
  const shownQuantity = Math.min(quantity, maxQuantity);
  const design = product.designs.find((option) => option.id === designId) ?? null;

  const errors = {
    size: product.sizes.length > 0 && !size ? "Please select a size." : null,
    color: product.colors.length > 0 && !color ? "Please select a color." : null,
    design: product.designs.length > 0 && !design ? "Please select a design." : null,
  };
  const shown = (error: string | null) => (attempted ? error : null);

  function selectImage(index: number) {
    setSlideshowPlaying(false);
    setImageIndex(index);
    const match = product.designs.find((option) => option.image === product.images[index]);
    if (match) setDesignId(match.id);
  }

  function selectDesign(id: string) {
    setSlideshowPlaying(false);
    setDesignId(id);
    const index = product.images.indexOf(product.designs.find((option) => option.id === id)?.image ?? "");
    if (index >= 0) setImageIndex(index);
  }

  function purchase(intent: PurchaseIntent) {
    setAttempted(true);
    setNotice(null);
    if (errors.size || errors.color || errors.design) return;
    const item = createCartItem(product, { size, color, design: design?.label ?? null, quantity: shownQuantity }, live);
    if (!item) return;

    if (intent === "buy-now") {
      // Hand this one item to checkout (sessionStorage, not the URL). No order is created.
      if (saveBuyNowItem(item)) router.push(`${ROUTES.checkout}?mode=buy-now`);
      else setNotice({ text: "Couldn't start checkout in this browser. Please add the item to your bag instead." });
      return;
    }

    const result = addItem(item, maxQuantity);
    if (result.status === "at-limit") {
      setNotice({
        text: `Your bag already has the maximum quantity (${result.quantity}) of this item.`,
        viewBag: true,
      });
      return;
    }
    setNotice({
      text:
        result.status === "capped"
          ? `Added to your bag — quantity limited to ${result.quantity} for this item.`
          : "Added to your bag.",
      viewBag: true,
    });
    openDrawer();
  }

  // Any change to the selection makes an old notice stale.
  function changed<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setNotice(null);
    };
  }

  const badges = getProductBadges(product).filter((badge) => badge.label !== "Low Stock");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,57fr)_minmax(0,43fr)] lg:gap-12 xl:gap-16">
      <ProductGallery
        name={product.name}
        images={product.images}
        videoSrc={videoSrc}
        activeIndex={imageIndex}
        onSelect={selectImage}
        onAutoSelect={setImageIndex}
        playing={slideshowPlaying}
        onPlayingChange={setSlideshowPlaying}
      />

      <div className="flex flex-col lg:pt-2">
        <Link
          href={ROUTES.shopCategory(product.categorySlug)}
          className="self-start text-xs font-medium tracking-[0.2em] text-muted uppercase transition-colors hover:text-primary-dark"
        >
          {product.category}
        </Link>

        <h1 className="mt-3 text-3xl leading-tight text-foreground md:text-4xl">{product.name}</h1>

        {badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <Badge key={badge.label} variant={badge.variant}>
                {badge.label}
              </Badge>
            ))}
          </div>
        )}

        <ProductPrice product={product} size="lg" className="mt-4" />
        <div className="mt-2 empty:hidden">
          <StockStatus stock={live.stock} unavailable={live.unavailable} />
        </div>

        <div className="mt-8 flex flex-col gap-6 border-t border-line pt-6">
          {product.sizes.length > 0 && (
            <OptionGroup label="Size" selectedLabel={size} error={shown(errors.size)}>
              {({ labelId, errorId }) => (
                <ChipOptions
                  options={product.sizes}
                  value={size}
                  onChange={changed(setSize)}
                  labelId={labelId}
                  errorId={errorId}
                  hasError={Boolean(shown(errors.size))}
                />
              )}
            </OptionGroup>
          )}

          {product.colors.length > 0 && (
            <OptionGroup label="Color" selectedLabel={color} error={shown(errors.color)}>
              {({ labelId, errorId }) => (
                <ChipOptions
                  options={product.colors}
                  value={color}
                  onChange={changed(setColor)}
                  labelId={labelId}
                  errorId={errorId}
                  hasError={Boolean(shown(errors.color))}
                />
              )}
            </OptionGroup>
          )}

          {product.designs.length > 0 && (
            <OptionGroup label="Design" selectedLabel={design?.label ?? null} error={shown(errors.design)}>
              {({ labelId, errorId }) => (
                <DesignOptions
                  designs={product.designs}
                  value={designId}
                  onChange={changed(selectDesign)}
                  labelId={labelId}
                  errorId={errorId}
                  hasError={Boolean(shown(errors.design))}
                />
              )}
            </OptionGroup>
          )}

          <div>
            <p id={quantityLabelId} className="text-sm font-medium text-foreground">
              Quantity
            </p>
            <div className="mt-2.5">
              <QuantitySelector
                value={shownQuantity}
                max={maxQuantity}
                onChange={changed(setQuantity)}
                disabled={!canPurchase}
                labelId={quantityLabelId}
              />
            </div>
          </div>
        </div>

        <div className="mt-8">
          {canPurchase ? (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="lg" fullWidth onClick={() => purchase("add-to-cart")}>
                Add to Cart
              </Button>
              <Button size="lg" fullWidth onClick={() => purchase("buy-now")}>
                Buy Now
              </Button>
            </div>
          ) : (
            <Button size="lg" fullWidth disabled>
              {live.unavailable ? "Currently Unavailable" : outOfStock ? "Out of Stock" : "Contact for Price"}
            </Button>
          )}

          {notice && (
            <p
              role="status"
              className="mt-4 flex gap-2.5 rounded-xl border border-line bg-blush/60 px-4 py-3 text-sm leading-relaxed text-foreground"
            >
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-dark" />
              <span>
                {notice.text}
                {notice.viewBag && (
                  <>
                    {" "}
                    <Link
                      href={ROUTES.cart}
                      className="font-medium underline decoration-primary-dark/40 underline-offset-4 hover:text-primary-dark"
                    >
                      View Bag
                    </Link>
                  </>
                )}
              </span>
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm">
          <Link
            href={ROUTES.shop}
            className="inline-flex items-center gap-2 text-foreground transition-colors hover:text-primary-dark"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Continue Shopping
          </Link>
          <Link
            href={ROUTES.shopCategory(product.categorySlug)}
            className="text-muted underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-primary-dark"
          >
            Browse {product.category}
          </Link>
        </div>
      </div>
    </div>
  );
}
