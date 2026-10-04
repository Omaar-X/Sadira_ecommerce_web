export type ProductStatus = "active" | "draft" | "archived";

/** A labelled attribute shown on the product page, e.g. { label: "Fabric", value: "Saudi chiffon" }. */
export interface ProductDetail {
  label: string;
  value: string;
}

/** One selectable design of a listing (e.g. a scarf print), tied to one of its photos. */
export interface ProductDesign {
  /** Stable id, e.g. "SAD-SCARF-001-D1". */
  id: string;
  label: string;
  image: string;
}

/**
 * Website product. The original JSON seeds the editable Google Sheets catalog.
 * Unknown values remain null or empty; stock is supplied by live inventory.
 */
export interface Product {
  /** Stable internal code, e.g. "SAD-ABAYA-001". */
  id: string;
  name: string;
  slug: string;
  /** Public category name, e.g. "Burka". */
  category: string;
  /** URL-safe category, e.g. "burka". */
  categorySlug: string;
  /** Regular price in BDT, or null when not listed. */
  price: number | null;
  /** Discounted price in BDT, or null when not on sale. */
  salePrice: number | null;
  description: string;
  /** Short highlight bullets. */
  features: string[];
  details: ProductDetail[];
  sizes: string[];
  colors: string[];
  /** Design variations to choose from; empty when the product has none. */
  designs: ProductDesign[];
  /** Units available, or null when stock isn't tracked yet. */
  stock: number | null;
  /** Product photos, e.g. "/catalog/abaya/sad-abaya-001/1.jpeg". The first is the cover. */
  images: string[];
  /**
   * INTERNAL: the original listing screenshot, relative to ../Image
   * (e.g. "Abaya/Abaya 4,5 details.png"). Never render this publicly.
   */
  detailsSource: string | null;
  featured: boolean;
  newArrival: boolean;
  status: ProductStatus;
}

/** A product without internal catalog-maintenance fields — safe to send to the browser. */
export type PublicProduct = Omit<Product, "detailsSource">;
