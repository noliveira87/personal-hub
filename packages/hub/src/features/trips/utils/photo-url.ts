const SUPABASE_PUBLIC_STORAGE_MARKER = "/storage/v1/object/public/";

type OptimizeTripPhotoOptions = {
  width?: number;
  height?: number;
  quality?: number;
};

export function optimizeTripPhotoUrl(photoUrl: string, options: OptimizeTripPhotoOptions = {}): string {
  const { width, height, quality = 72 } = options;

  try {
    const parsed = new URL(photoUrl);
    if (!parsed.pathname.includes(SUPABASE_PUBLIC_STORAGE_MARKER)) {
      return photoUrl;
    }

    if (width) parsed.searchParams.set("width", String(width));
    if (height) parsed.searchParams.set("height", String(height));
    parsed.searchParams.set("quality", String(quality));

    return parsed.toString();
  } catch {
    return photoUrl;
  }
}