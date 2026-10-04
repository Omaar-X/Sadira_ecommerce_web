export interface Category {
  id: string;
  name: string;
  slug: string;
  /** Public image path, or null when no image is available yet. */
  image: string | null;
  description: string | null;
}
