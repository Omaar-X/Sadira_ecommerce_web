import { randomUUID } from "node:crypto";
import { Heading } from "@/components/admin/Data";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { getAppsScriptConfig } from "@/lib/delivery";
import type { Product } from "@/types/product";
export default function NewProduct() {
  const product: Product = { id: `SAD-${randomUUID().toUpperCase()}`, name: "", slug: "", category: "Abaya", categorySlug: "abaya", price: null, salePrice: null, description: "", features: [], details: [], sizes: [], colors: [], designs: [], stock: null, images: [], detailsSource: null, featured: false, newArrival: true, status: "active" };
  return <><Heading title="Add product" description="Upload photos, add a price and details, then publish to your store." /><ProductEditor initial={product} revision="" create configured={!!getAppsScriptConfig()} /></>;
}
