/**
 * One-time / local catalog preparation. Run with: npm run catalog:prepare
 *
 * Reads   catalog/products.source.json  (product info transcribed from the
 *                                        details images — edit this by hand)
 *         ../Image/                     (original assets — READ ONLY)
 * Writes  public/catalog/<category>/<product-id>/  (byte-for-byte copies of product
 *                                                  photos; details screenshots stay private)
 *         public/brand/logo.png
 *         data/products.generated.json
 *         data/categories.generated.json
 *
 * The website never reads ../Image or runs OCR; it only uses the generated files.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(ROOT, "catalog", "products.source.json");
const PUBLIC_CATALOG_DIR = path.join(ROOT, "public", "catalog");
const PRODUCTS_OUT = path.join(ROOT, "data", "products.generated.json");
const CATEGORIES_OUT = path.join(ROOT, "data", "categories.generated.json");
const LOGO_SOURCE = path.join("logo", "logo.png");
const LOGO_OUT = path.join(ROOT, "public", "brand", "logo.png");
const IGNORED_SOURCE_FILES = new Set(["desktop.ini", "thumbs.db", ".ds_store"]);

const errors = [];
const warnings = [];

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const SOURCE_DIR = path.resolve(ROOT, manifest.sourceDir);

if (!existsSync(SOURCE_DIR)) {
  console.error(`Source folder not found: ${SOURCE_DIR}`);
  process.exit(1);
}

/** Guard: nothing may ever be written inside the original asset folder. */
function assertOutsideSource(target) {
  const relative = path.relative(SOURCE_DIR, target);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new Error(`Refusing to write inside the source folder: ${target}`);
  }
}

function copyAsset(from, to) {
  assertOutsideSource(to);
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(from, to); // exact copy — no recompression or colour changes
}

function toPublicPath(absolute) {
  return "/" + path.relative(path.join(ROOT, "public"), absolute).split(path.sep).join("/");
}

// ---- Validate manifest ---------------------------------------------------

const categoriesBySlug = new Map(manifest.categories.map((category) => [category.slug, category]));
const seenIds = new Set();
const seenSlugs = new Set();
const referencedFiles = new Set();

for (const product of manifest.products) {
  const category = categoriesBySlug.get(product.category);
  const label = product.id ?? product.name;

  if (!category) {
    errors.push(`${label}: unknown category "${product.category}"`);
    continue;
  }
  if (!new RegExp(`^SAD-${category.idCode}-\\d{3}$`).test(product.id)) {
    errors.push(`${label}: id must look like SAD-${category.idCode}-001`);
  }
  if (seenIds.has(product.id)) errors.push(`${label}: duplicate id`);
  if (seenSlugs.has(product.slug)) errors.push(`${label}: duplicate slug "${product.slug}"`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug)) errors.push(`${label}: invalid slug "${product.slug}"`);
  seenIds.add(product.id);
  seenSlugs.add(product.slug);

  const files = [...product.photos, ...(product.detailsSource ? [product.detailsSource] : [])];
  for (const file of files) {
    const absolute = path.join(SOURCE_DIR, category.folder, file);
    if (!existsSync(absolute)) errors.push(`${label}: missing source file ${category.folder}/${file}`);
    referencedFiles.add(path.join(category.folder, file).toLowerCase());
  }
  if (product.photos.length === 0) errors.push(`${label}: needs at least one product photo`);
  for (const design of product.designs ?? []) {
    if (!product.photos.includes(design.photo)) {
      errors.push(`${label}: design "${design.label}" uses ${design.photo}, which isn't in photos`);
    }
  }

  if (product.price === null) warnings.push(`${label}: no price`);
  if (!product.description && product.features.length === 0 && product.details.length === 0) {
    warnings.push(`${label}: no description or details`);
  }
}

if (errors.length > 0) {
  console.error("Catalog preparation failed:\n  - " + errors.join("\n  - "));
  process.exit(1);
}

// Report source files that no product uses (e.g. newly added photos).
for (const category of manifest.categories) {
  const folder = path.join(SOURCE_DIR, category.folder);
  if (!existsSync(folder)) {
    warnings.push(`Category folder missing: ${category.folder}/`);
    continue;
  }
  const files = readdirSync(folder, { withFileTypes: true }).filter(
    (entry) => entry.isFile() && !IGNORED_SOURCE_FILES.has(entry.name.toLowerCase()),
  );
  if (files.length === 0) warnings.push(`${category.folder}/ is empty — no products`);
  for (const file of files) {
    if (!referencedFiles.has(path.join(category.folder, file.name).toLowerCase())) {
      warnings.push(`Unused source file: ${category.folder}/${file.name}`);
    }
  }
}

// ---- Copy assets & build JSON ---------------------------------------------

assertOutsideSource(PUBLIC_CATALOG_DIR);
rmSync(PUBLIC_CATALOG_DIR, { recursive: true, force: true }); // generated output only

const products = manifest.products.map((product) => {
  const category = categoriesBySlug.get(product.category);
  const sourceFolder = path.join(SOURCE_DIR, category.folder);
  const outFolder = path.join(PUBLIC_CATALOG_DIR, category.slug, product.id.toLowerCase());

  const imageByPhoto = new Map();
  const images = product.photos.map((file, index) => {
    const out = path.join(outFolder, `${index + 1}${path.extname(file).toLowerCase()}`);
    copyAsset(path.join(sourceFolder, file), out);
    imageByPhoto.set(file, toPublicPath(out));
    return toPublicPath(out);
  });

  const designs = (product.designs ?? []).map((design, index) => ({
    id: `${product.id}-D${index + 1}`,
    label: design.label,
    image: imageByPhoto.get(design.photo),
  }));

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: category.name,
    categorySlug: category.slug,
    price: product.price,
    salePrice: product.salePrice,
    description: product.description,
    features: product.features,
    details: product.details,
    sizes: product.sizes,
    colors: product.colors,
    designs,
    stock: product.stock,
    images,
    // Internal reference only (WhatsApp screenshot) — not copied to public/.
    detailsSource: product.detailsSource
      ? path.posix.join(category.folder, product.detailsSource)
      : null,
    featured: product.featured,
    newArrival: product.newArrival,
    status: product.status,
  };
});

const categories = manifest.categories.map((category) => {
  const cover = products.find((product) => product.categorySlug === category.slug);
  return {
    id: `CAT-${category.idCode}`,
    name: category.name,
    slug: category.slug,
    image: cover ? cover.images[0] : null,
    description: null,
  };
});

writeFileSync(PRODUCTS_OUT, JSON.stringify(products, null, 2) + "\n");
writeFileSync(CATEGORIES_OUT, JSON.stringify(categories, null, 2) + "\n");

const logoSource = path.join(SOURCE_DIR, LOGO_SOURCE);
if (existsSync(logoSource)) copyAsset(logoSource, LOGO_OUT);
else warnings.push(`Logo not found at ${LOGO_SOURCE}`);

// ---- Summary ----------------------------------------------------------------

console.log(`✓ ${products.length} products, ${categories.length} categories`);
for (const category of categories) {
  const count = products.filter((product) => product.categorySlug === category.slug).length;
  console.log(`  ${category.name.padEnd(10)} ${count}`);
}
console.log(`✓ Wrote ${path.relative(ROOT, PRODUCTS_OUT)} and ${path.relative(ROOT, CATEGORIES_OUT)}`);
console.log(`✓ Copied images to ${path.relative(ROOT, PUBLIC_CATALOG_DIR)}/`);
if (warnings.length > 0) console.log("\nWarnings:\n  - " + warnings.join("\n  - "));
