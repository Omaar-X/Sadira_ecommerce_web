import { notFound } from "next/navigation";
import { Heading, LoadError } from "@/components/admin/Data";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { getCatalogEntries, CatalogLoadError } from "@/services/catalogService";
import { getAppsScriptConfig } from "@/lib/delivery";
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let entries;
  try { entries = await getCatalogEntries(); } catch (error) { if (error instanceof CatalogLoadError) return <LoadError />; throw error; }
  const entry = entries.find(entry => entry.product.id === id);
  if (!entry) notFound();
  return <><Heading title={`Edit ${entry.product.name}`} description="Update photos, price and details. Stock changes are managed separately." /><ProductEditor initial={entry.product} revision={entry.revision} create={false} configured={!!getAppsScriptConfig()} /></>;
}
