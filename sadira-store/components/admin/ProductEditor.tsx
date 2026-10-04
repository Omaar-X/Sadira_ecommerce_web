"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import categories from "@/data/categories.generated.json";
import { MAX_PRODUCT_IMAGES, MAX_IMAGE_BYTES } from "@/lib/catalogValidation";
import { slugify } from "@/lib/utils";
import type { Product } from "@/types/product";

async function preparePhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error("Choose JPEG, PNG or WebP photos up to 20 MB. Export HEIC photos as JPEG first.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare this photo.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.75, 0.6]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
    }
    throw new Error("This photo is too large. Choose a smaller version.");
  } finally { bitmap.close(); }
}
export function ProductEditor({ initial, revision: initialRevision, create, configured }: { initial: Product; revision: string; create: boolean; configured: boolean }) {
  const router = useRouter();
  const [images, setImages] = useState(initial.images);
  const [designs, setDesigns] = useState<Record<string, string>>(Object.fromEntries(initial.designs.map(d => [d.image, d.label])));
  const [revision, setRevision] = useState(initialRevision);
  const [isNew, setIsNew] = useState(create);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedSlug, setSavedSlug] = useState(initial.slug);
  const [savedStatus, setSavedStatus] = useState(initial.status);
  async function upload(files: File[]) {
    if (busy || !files.length) return;
    if (files.length + images.length > MAX_PRODUCT_IMAGES) { setError("Use up to 10 photos per product."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${files.length}…`);
        const blob = await preparePhoto(files[i]);
        const form = new FormData();
        form.append("image", blob, "product.jpg");
        form.append("uploadKey", crypto.randomUUID());
        const response = await fetch("/api/admin/products/images", { method: "POST", body: form });
        const result = await response.json();
        if (response.status === 401) { router.replace("/admin/login"); return; }
        if (!response.ok || !result.success) throw new Error(result.message || "Photo upload failed.");
        setImages(current => [...current, result.image]);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Photo upload failed. Photos already uploaded remain below; select only the remaining photos to retry."); }
    finally { setBusy(false); setProgress(""); }
  }
  function move(index: number, offset: number) {
    setImages(current => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setError(""); setMessage("");
    if (!images.length) { setError("Upload at least one product photo."); return; }
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || "").trim();
    const lines = (name: string) => value(name).split(/\r?\n/).map(v => v.trim()).filter(Boolean);
    const details = lines("details").map(line => { const separator = line.indexOf(":"); return { label: separator < 0 ? "" : line.slice(0, separator).trim(), value: separator < 0 ? "" : line.slice(separator + 1).trim() }; });
    if (details.some(d => !d.label || !d.value)) { setError("Enter details as Label: Value, one per line. Example: Fabric: Georgette"); return; }
    const price = Number(value("price"));
    const salePrice = value("salePrice") === "" ? null : Number(value("salePrice"));
    if (!Number.isSafeInteger(price) || price < 0 || salePrice !== null && (!Number.isSafeInteger(salePrice) || salePrice < 0 || salePrice >= price)) { setError("Enter a whole-taka price. Offer price must be lower than the regular price."); return; }
    const slug = isNew ? slugify(value("slug") || value("name")) : initial.slug || savedSlug;
    if (!slug) { setError("Enter an English page address, such as floral-abaya."); return; }
    const category = categories.find(c => c.slug === value("category"))!;
    const product: Product = { ...initial, name: value("name"), slug, category: category.name, categorySlug: category.slug,
      price, salePrice, description: value("description"), features: lines("features"), details, sizes: lines("sizes"), colors: lines("colors"),
      images, designs: images.filter(image => designs[image]?.trim()).map((image, i) => ({ id: `${initial.id}-D${i + 1}`, label: designs[image].trim(), image })),
      stock: isNew ? form.has("trackStock") ? Number(value("stock")) : null : initial.stock,
      status: value("status") as Product["status"], featured: form.has("featured"), newArrival: form.has("newArrival"), detailsSource: null };
    setBusy(true); setProgress("Saving product…");
    try {
      const response = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product, create: isNew, expectedRevision: revision }) });
      const result = await response.json();
      if (response.status === 401) { router.replace("/admin/login"); return; }
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to save product.");
      setRevision(result.revision); setIsNew(false); setSavedSlug(slug); setSavedStatus(product.status);
      setMessage(product.status === "active" ? "Product published. It is now available on the website." : "Product saved. It is hidden from the website.");
      if (isNew) router.replace(`/admin/products/${initial.id}`);
      else router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Save was not confirmed. Check the product list before retrying."); }
    finally { setBusy(false); setProgress(""); }
  }
  return <form className="admin-product-editor" onSubmit={save}>
    {!configured && <p className="admin-notice" role="alert">Google Sheets is not connected yet. Configure the Apps Script deployment before uploading or saving products.</p>}
    <fieldset disabled={busy || !configured} className="admin-editor-fields">
      <section className="admin-card admin-form"><h2>Product information</h2>
        <label>Product name<input name="name" defaultValue={initial.name} required maxLength={150} /></label>
        <div className="admin-editor-grid"><label>Category<select name="category" defaultValue={initial.categorySlug}>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
          <label>Visibility<select name="status" defaultValue={initial.status}><option value="active">Published — visible on website</option><option value="draft">Draft — hidden</option><option value="archived">Archived — hidden</option></select></label></div>
        <label>Page address<input name="slug" defaultValue={initial.slug} readOnly={!isNew} placeholder="floral-abaya (optional for English names)" maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" /><span className="admin-muted">{isNew ? "English lowercase letters, numbers and hyphens. Leave blank to use the product name." : "The page address stays the same when you edit the product."}</span></label>
        <div className="admin-editor-grid"><label>Price (৳)<input name="price" type="number" required min={0} max={10000000} step={1} defaultValue={initial.price ?? ""} /></label><label>Offer price (৳, optional)<input name="salePrice" type="number" min={0} max={10000000} step={1} defaultValue={initial.salePrice ?? ""} /></label></div>
        <label>Description<textarea name="description" rows={5} maxLength={5000} defaultValue={initial.description} /></label>
        <label>Details — one per line<textarea name="details" rows={5} placeholder={"Fabric: Georgette\nIncludes: Abaya + Hijab"} defaultValue={initial.details.map(d => `${d.label}: ${d.value}`).join("\n")} /></label>
        <label>Highlights — one per line<textarea name="features" rows={3} defaultValue={initial.features.join("\n")} /></label>
        <div className="admin-editor-grid"><label>Sizes — one per line<textarea name="sizes" rows={4} placeholder={"52\n54\n56"} defaultValue={initial.sizes.join("\n")} /></label><label>Colors — one per line<textarea name="colors" rows={4} placeholder={"Black\nBrown"} defaultValue={initial.colors.join("\n")} /></label></div>
        <div className="admin-editor-grid"><label className="admin-checkbox"><input type="checkbox" name="featured" defaultChecked={initial.featured} /> Featured product</label><label className="admin-checkbox"><input type="checkbox" name="newArrival" defaultChecked={initial.newArrival} /> New arrival</label></div>
        {isNew ? <><label className="admin-checkbox"><input name="trackStock" type="checkbox" defaultChecked={initial.stock !== null} /> Track stock</label><label>Initial stock<input name="stock" type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={initial.stock ?? 0} /></label></> : <p className="admin-muted">Change stock from Products → Set Stock. Editing details preserves your current stock.</p>}
      </section>
      <section className="admin-card admin-form"><h2>Product photos</h2><p className="admin-muted">Choose up to 10 photos from your phone or computer. The first photo is the cover. Photos are resized for the website.</p>
        <label>Choose photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ""; void upload(files); }} /></label>
        <div className="admin-photo-grid">{images.map((image, index) => <div className="admin-photo" key={image}><Image src={image} alt={`Product photo ${index + 1}`} width={240} height={300} unoptimized className="admin-photo-preview" /><span className="admin-muted">{index === 0 ? "Cover photo" : `Photo ${index + 1}`}</span>
          <div className="admin-photo-actions"><button className="admin-button" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move photo ${index + 1} earlier`}>←</button><button className="admin-button" type="button" disabled={index === images.length - 1} onClick={() => move(index, 1)} aria-label={`Move photo ${index + 1} later`}>→</button><button type="button" className="admin-button danger" onClick={() => setImages(current => current.filter(url => url !== image))}>Remove</button></div>
          <label>Design name (optional)<input value={designs[image] || ""} maxLength={100} onChange={event => setDesigns(current => ({ ...current, [image]: event.target.value }))} placeholder="Design 1" /></label></div>)}</div>
      </section>
    </fieldset>
    <div className="admin-card admin-editor-footer">{error && <p className="admin-error" role="alert">{error}</p>}{progress && <p role="status">{progress}</p>}{message && <p className="admin-success" role="status">{message} {savedStatus === "active" && <Link href={`/product/${savedSlug}`} target="_blank">View product →</Link>}</p>}
      <div className="admin-inline-actions"><button className="admin-button primary" disabled={busy || !configured}>{busy ? "Please wait…" : "Save product"}</button><Link className="admin-button" href="/admin/products">Back to products</Link></div>
    </div>
  </form>;
}
