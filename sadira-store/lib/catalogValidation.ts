import categories from "@/data/categories.generated.json";
import type { Product } from "@/types/product";

export const MAX_PRODUCT_IMAGES = 10;
export const MAX_IMAGE_BYTES = 1024 * 1024;
export const PRODUCT_ID = /^SAD-[A-Z0-9-]{1,60}$/;
export const IMAGE_PATH = /^\/api\/catalog\/images\/[A-Za-z0-9_-]{10,150}$/;
const localImage = /^\/catalog\/[a-z0-9/-]+\.(jpeg|jpg|png|webp)$/;
export function validProductImage(value: unknown): value is string {
  return typeof value === "string" && (IMAGE_PATH.test(value) || localImage.test(value));
}
function stringList(value: unknown, max = 30): value is string[] {
  return Array.isArray(value) && value.length <= max && value.every(v => typeof v === "string" && v.trim().length > 0 && v.length <= 100);
}
/** Strict validation shared by the editor API and the live catalog reader. */
export function parseCatalogProduct(value: unknown): Product | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Product;
  const category = categories.find(c => c.slug === p.categorySlug);
  if (!PRODUCT_ID.test(p.id) || typeof p.name !== "string" || !p.name.trim() || p.name.length > 150 ||
      typeof p.slug !== "string" || p.slug.length > 180 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) || !category ||
      !(p.price === null || Number.isSafeInteger(p.price) && p.price >= 0 && p.price <= 10000000) ||
      !(p.salePrice === null || Number.isSafeInteger(p.salePrice) && p.salePrice >= 0 && p.price !== null && p.salePrice < p.price) ||
      typeof p.description !== "string" || p.description.length > 5000 || !stringList(p.features) ||
      !stringList(p.sizes) || !stringList(p.colors) ||
      !Array.isArray(p.details) || p.details.length > 30 || p.details.some(d => !d || typeof d.label !== "string" || !d.label.trim() || d.label.length > 100 || typeof d.value !== "string" || !d.value.trim() || d.value.length > 500) ||
      !Array.isArray(p.images) || !p.images.length || p.images.length > MAX_PRODUCT_IMAGES || !p.images.every(validProductImage) ||
      !Array.isArray(p.designs) || p.designs.length > 30 || p.designs.some(d => !d || typeof d.id !== "string" || d.id.length > 100 || typeof d.label !== "string" || !d.label.trim() || d.label.length > 100 || !p.images.includes(d.image)) ||
      !(p.stock === null || Number.isSafeInteger(p.stock) && p.stock >= 0) ||
      typeof p.featured !== "boolean" || typeof p.newArrival !== "boolean" || !["active", "draft", "archived"].includes(p.status)) return null;
  return { id: p.id, name: p.name.trim(), slug: p.slug, category: category.name, categorySlug: category.slug,
    price: p.price, salePrice: p.salePrice, description: p.description.trim(), features: p.features,
    details: p.details, sizes: p.sizes, colors: p.colors, designs: p.designs, stock: p.stock,
    images: p.images, detailsSource: null, featured: p.featured, newArrival: p.newArrival, status: p.status };
}
