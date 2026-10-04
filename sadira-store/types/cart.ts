/**
 * One cart line — a product in a specific variant. Stored in the browser
 * (localStorage), so it is display data only: checkout re-validates the
 * product, price and availability on the server before any order is saved.
 */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  /** Public category name, e.g. "Abaya". */
  category: string;
  size: string | null;
  color: string | null;
  /** Selected design label (e.g. "Design 2"), for products with design variations. */
  design: string | null;
  quantity: number;
  /**
   * Effective unit price (sale price when on sale) in BDT when the item was
   * added. Display only — checkout re-reads prices from the catalog.
   */
  price: number;
  /** Stock available when the item was added (used to cap quantity), or null if untracked. */
  stock: number | null;
}

/** What the customer chose on the product page. */
export interface ProductSelection {
  size: string | null;
  color: string | null;
  design: string | null;
  quantity: number;
}
