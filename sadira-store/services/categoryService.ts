import categoriesData from "@/data/categories.generated.json";
import type { Category } from "@/types/category";
import { getCatalogProducts } from "@/services/catalogService";

const categories = categoriesData as Category[];

export async function getCategories(): Promise<Category[]> {
  const products = await getCatalogProducts();
  return categories.map(category => ({ ...category, image: products.find(product => product.categorySlug === category.slug && product.status === "active")?.images[0] ?? category.image }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return (await getCategories()).find((category) => category.slug === slug) ?? null;
}
