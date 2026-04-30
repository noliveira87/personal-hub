import { supabase } from "@/lib/supabase";

export const SHOWS_BUCKET = "shows";

export interface Show {
  id: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  venue: string;
  city: string;
  description?: string;
  notes?: string;
  coverImageUrl?: string;
  galleryPaths: string[];
  galleryImageUrls: string[];
  rating: number; // 0-5
  tags: string[];
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShowInput {
  title: string;
  date: string;
  venue: string;
  city: string;
  description?: string;
  notes?: string;
  coverImagePath?: string;
  galleryPaths?: string[];
  rating?: number;
  tags?: string[];
  favorite?: boolean;
}

export interface ShowUpdate {
  title?: string;
  date?: string;
  venue?: string;
  city?: string;
  description?: string;
  notes?: string;
  coverImagePath?: string;
  galleryPaths?: string[];
  rating?: number;
  tags?: string[];
  favorite?: boolean;
}

type ShowRow = {
  id: string;
  title: string;
  date: string;
  venue: string;
  city: string;
  description: string | null;
  notes: string | null;
  cover_image_path: string | null;
  gallery_paths?: string[] | null;
  rating?: number;
  tags?: string[];
  favorite?: boolean;
  created_at?: string;
  updated_at?: string;
};

const isMissingShowsTableError = (error: { message?: string } | null) => {
  const message = error?.message ?? "";
  return /shows/i.test(message) && /does not exist/i.test(message);
};

const isMissingGalleryPathsColumnError = (error: { message?: string } | null) => {
  const message = error?.message ?? "";
  return /gallery_paths/i.test(message) && /does not exist|column/i.test(message);
};

const isMissingColumnError = (error: { message?: string; code?: string } | null) => {
  const message = error?.message ?? "";
  return /does not exist|column/i.test(message) || error?.code === "PGRST204";
};

const extractMissingColumn = (error: { message?: string; details?: string; hint?: string } | null): string | null => {
  const raw = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  if (!raw) return null;

  // Common PostgREST/Postgres message shapes:
  // - Could not find the 'updated_at' column
  // - column shows.gallery_paths does not exist
  // - column "rating" does not exist
  const patterns = [
    /'([a-zA-Z0-9_]+)'\s+column/i,
    /column\s+"?([a-zA-Z0-9_]+)"?\s+does not exist/i,
    /column\s+[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+)\s+does not exist/i,
  ] as const;

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
};

const resolveCoverImageUrl = (imagePath: string | null) => {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const { data } = supabase.storage.from(SHOWS_BUCKET).getPublicUrl(imagePath);
  return data.publicUrl;
};

const mapRowToShow = (row: ShowRow): Show => ({
  id: row.id,
  title: row.title,
  date: row.date,
  venue: row.venue,
  city: row.city,
  description: row.description ?? "",
  notes: row.notes ?? "",
  coverImageUrl: resolveCoverImageUrl(row.cover_image_path),
  galleryPaths: row.gallery_paths ?? [],
  galleryImageUrls: (row.gallery_paths ?? []).map((path) => resolveCoverImageUrl(path)),
  rating: row.rating ?? 0,
  tags: row.tags ?? [],
  favorite: row.favorite ?? false,
  createdAt: row.created_at ?? "",
  updatedAt: row.updated_at ?? "",
});

const toNullableTrimmed = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const ensurePublicPath = (pathOrUrl?: string) => {
  const value = pathOrUrl?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return value;
};

const getShowCoverImagePath = (pathOrUrl?: string | null) => {
  const value = pathOrUrl?.trim();
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  const markers = [
    `/storage/v1/object/public/${SHOWS_BUCKET}/`,
    `/storage/v1/object/sign/${SHOWS_BUCKET}/`,
    `/object/public/${SHOWS_BUCKET}/`,
    `/object/sign/${SHOWS_BUCKET}/`,
  ];

  for (const marker of markers) {
    const markerIndex = value.indexOf(marker);
    if (markerIndex === -1) continue;

    const rawPath = value.slice(markerIndex + marker.length).split("?")[0];
    if (rawPath) return decodeURIComponent(rawPath);
  }

  return null;
};

const toInsertRow = (input: ShowInput) => ({
  title: input.title.trim(),
  date: input.date,
  venue: input.venue.trim(),
  city: input.city.trim(),
  description: toNullableTrimmed(input.description),
  notes: toNullableTrimmed(input.notes),
  cover_image_path: ensurePublicPath(input.coverImagePath),
  gallery_paths: input.galleryPaths ?? [],
  rating: input.rating ?? 0,
  tags: input.tags ?? [],
  favorite: input.favorite ?? false,
});

const toUpdateRow = (input: ShowUpdate) => {
  const row: Record<string, unknown> = {};

  if (input.title !== undefined) row.title = input.title.trim();
  if (input.date !== undefined) row.date = input.date;
  if (input.venue !== undefined) row.venue = input.venue.trim();
  if (input.city !== undefined) row.city = input.city.trim();
  if (input.description !== undefined) row.description = toNullableTrimmed(input.description);
  if (input.notes !== undefined) row.notes = toNullableTrimmed(input.notes);
  if (input.coverImagePath !== undefined) row.cover_image_path = ensurePublicPath(input.coverImagePath);
  if (input.galleryPaths !== undefined) row.gallery_paths = input.galleryPaths;
  if (input.rating !== undefined) row.rating = input.rating;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.favorite !== undefined) row.favorite = input.favorite;

  return row;
};

export async function loadShows(): Promise<{ items: Show[]; setupRequired: boolean }> {
  const selectAttempts = [
    "id, title, date, venue, city, description, notes, cover_image_path, rating, tags, favorite, gallery_paths, created_at, updated_at",
    "id, title, date, venue, city, description, notes, cover_image_path, rating, tags, favorite, created_at, updated_at",
    "id, title, date, venue, city, description, notes, cover_image_path, rating, tags, favorite, gallery_paths",
    "id, title, date, venue, city, description, notes, cover_image_path, rating, tags, favorite",
    "id, title, date, venue, city, description, notes, cover_image_path, favorite",
  ] as const;

  let lastError: { message?: string } | null = null;

  for (const select of selectAttempts) {
    const { data, error } = await supabase
      .from("shows")
      .select(select)
      .order("date", { ascending: false });

    if (!error) {
      const rows = (data ?? []) as ShowRow[];
      return {
        items: rows.map((row) =>
          mapRowToShow({
            ...row,
            gallery_paths: row.gallery_paths ?? [],
            created_at: row.created_at ?? "",
            updated_at: row.updated_at ?? "",
          })
        ),
        setupRequired: false,
      };
    }

    if (isMissingShowsTableError(error)) {
      return { items: [], setupRequired: true };
    }

    lastError = error;

    // If the error is unrelated to missing columns/schema shape, stop retrying.
    if (!/column|does not exist|schema|select|order/i.test(error.message ?? "")) {
      break;
    }
  }

  console.error("Error loading shows:", lastError);
  return { items: [], setupRequired: false };
}

export async function createShow(input: ShowInput): Promise<{ show?: Show; error?: string }> {
  const row = toInsertRow(input);

  const payload: Record<string, unknown> = { ...row };
  const removedColumns = new Set<string>();

  for (let i = 0; i < 6; i++) {
    const { data, error } = await supabase
      .from("shows")
      .insert([payload])
      .select()
      .single();

    if (!error) {
      return { show: mapRowToShow(data as ShowRow) };
    }

    if (!isMissingColumnError(error)) {
      console.error("Error creating show:", error);
      return { error: error.message };
    }

    const missingColumn = extractMissingColumn(error as { message?: string; details?: string; hint?: string } | null);
    if (!missingColumn || removedColumns.has(missingColumn) || !(missingColumn in payload)) {
      console.error("Error creating show:", error);
      return { error: error.message };
    }

    removedColumns.add(missingColumn);
    delete payload[missingColumn];
  }

  return { error: "Create failed after schema fallback retries" };
}

export async function updateShow(id: string, input: ShowUpdate): Promise<{ show?: Show; error?: string }> {
  const row = toUpdateRow(input);
  row.updated_at = new Date().toISOString();

  const payload: Record<string, unknown> = { ...row };
  const removedColumns = new Set<string>();

  // Retry by removing only the column that actually failed.
  for (let i = 0; i < 6; i++) {
    const { data, error } = await supabase
      .from("shows")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (!error) {
      return { show: mapRowToShow(data as ShowRow) };
    }

    if (!isMissingColumnError(error)) {
      console.error("Error updating show:", error);
      return { error: error.message };
    }

    const missingColumn = extractMissingColumn(error as { message?: string; details?: string; hint?: string } | null);
    if (!missingColumn || removedColumns.has(missingColumn) || !(missingColumn in payload)) {
      console.error("Error updating show:", error);
      return { error: error.message };
    }

    removedColumns.add(missingColumn);
    delete payload[missingColumn];
  }

  return { error: "Update failed after schema fallback retries" };
}

export async function deleteShow(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("shows")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting show:", error);
    return { error: error.message };
  }

  return {};
}

export async function uploadShowCoverImage(
  file: File,
  fileName?: string
): Promise<{ path?: string; error?: string }> {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const finalFileName = fileName || `show-${timestamp}-${randomStr}`;

  const { data, error } = await supabase.storage
    .from(SHOWS_BUCKET)
    .upload(finalFileName, file, { upsert: false });

  if (error) {
    console.error("Error uploading show cover image:", error);
    return { error: error.message };
  }

  return { path: data.path };
}

export async function deleteShowCoverImage(imagePath: string): Promise<{ error?: string }> {
  // Extract the path from a full URL if needed
  const path = getShowCoverImagePath(imagePath) || imagePath;

  const { error } = await supabase.storage
    .from(SHOWS_BUCKET)
    .remove([path]);

  if (error) {
    console.error("Error deleting show cover image:", error);
    return { error: error.message };
  }

  return {};
}
