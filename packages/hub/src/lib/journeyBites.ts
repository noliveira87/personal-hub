import { supabase } from "@/lib/supabase";
import { TripFood } from "@/features/trips/types/trip";

export const JOURNEY_BITES_BUCKET = "journey-bites";

export interface JourneyBite {
  id: string;
  tripId: string;
  dishName: string;
  description: string;
  restaurantName: string;
  restaurantAddress: string;
  reviewUrl: string;
  photoUrl: string;
  eatenOn: string;
  createdAt: string;
  trip: {
    id: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
  } | null;
}

export interface JourneyBiteInput {
  tripId: string;
  dishName: string;
  description?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  reviewUrl?: string;
  photoPath?: string;
  eatenOn?: string;
  sourceFoodIndex?: number;
  sortOrder?: number;
}

export interface JourneyBiteUpdate {
  tripId?: string;
  dishName?: string;
  description?: string;
  restaurantName?: string;
  restaurantAddress?: string;
  reviewUrl?: string;
  photoPath?: string;
  eatenOn?: string;
  sortOrder?: number;
}

type JourneyBiteRow = {
  id: string;
  trip_id: string;
  dish_name: string;
  description: string | null;
  restaurant_name: string | null;
  restaurant_address: string | null;
  review_url: string | null;
  photo_path: string | null;
  eaten_on: string | null;
  created_at: string;
};

type TripLookupRow = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
};

const isMissingJourneyBitesTableError = (error: { message?: string } | null) => {
  const message = error?.message ?? "";
  return /journey_bites/i.test(message) && /does not exist/i.test(message);
};

const resolvePhotoUrl = (photoPath: string | null) => {
  if (!photoPath) return "";
  if (/^https?:\/\//i.test(photoPath)) return photoPath;
  const { data } = supabase.storage.from(JOURNEY_BITES_BUCKET).getPublicUrl(photoPath);
  return data.publicUrl;
};

const mapRowToJourneyBite = (row: JourneyBiteRow): JourneyBite => ({
  id: row.id,
  tripId: row.trip_id,
  dishName: row.dish_name,
  description: row.description ?? "",
  restaurantName: row.restaurant_name ?? "",
  restaurantAddress: row.restaurant_address ?? "",
  reviewUrl: row.review_url ?? "",
  photoUrl: resolvePhotoUrl(row.photo_path),
  eatenOn: row.eaten_on ?? "",
  createdAt: row.created_at,
  trip: null,
});

const toNullableTrimmed = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const isConflictError = (error: { code?: string } | null) => error?.code === "23505";

const ensurePublicPath = (pathOrUrl?: string) => {
  const value = pathOrUrl?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return value;
};

const getJourneyBitePhotoPath = (pathOrUrl?: string | null) => {
  const value = pathOrUrl?.trim();
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  const markers = [
    `/storage/v1/object/public/${JOURNEY_BITES_BUCKET}/`,
    `/storage/v1/object/sign/${JOURNEY_BITES_BUCKET}/`,
    `/object/public/${JOURNEY_BITES_BUCKET}/`,
    `/object/sign/${JOURNEY_BITES_BUCKET}/`,
  ];

  for (const marker of markers) {
    const markerIndex = value.indexOf(marker);
    if (markerIndex === -1) continue;

    const rawPath = value.slice(markerIndex + marker.length).split("?")[0];
    if (rawPath) return decodeURIComponent(rawPath);
  }

  return null;
};

const toInsertRow = (input: JourneyBiteInput) => ({
  trip_id: input.tripId,
  source_food_index: input.sourceFoodIndex ?? null,
  dish_name: input.dishName.trim(),
  description: toNullableTrimmed(input.description),
  restaurant_name: toNullableTrimmed(input.restaurantName),
  restaurant_address: toNullableTrimmed(input.restaurantAddress),
  review_url: toNullableTrimmed(input.reviewUrl),
  photo_path: ensurePublicPath(input.photoPath),
  eaten_on: toNullableTrimmed(input.eatenOn),
  sort_order: input.sortOrder ?? 0,
});

const toUpdateRow = (input: JourneyBiteUpdate) => {
  const row: Record<string, unknown> = {};

  if (input.tripId !== undefined) row.trip_id = input.tripId;
  if (input.dishName !== undefined) row.dish_name = input.dishName.trim();
  if (input.description !== undefined) row.description = toNullableTrimmed(input.description);
  if (input.restaurantName !== undefined) row.restaurant_name = toNullableTrimmed(input.restaurantName);
  if (input.restaurantAddress !== undefined) row.restaurant_address = toNullableTrimmed(input.restaurantAddress);
  if (input.reviewUrl !== undefined) row.review_url = toNullableTrimmed(input.reviewUrl);
  if (input.photoPath !== undefined) row.photo_path = ensurePublicPath(input.photoPath);
  if (input.eatenOn !== undefined) row.eaten_on = toNullableTrimmed(input.eatenOn);
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;

  return row;
};

export async function loadJourneyBites(): Promise<{ items: JourneyBite[]; setupRequired: boolean }> {
  const { data, error } = await supabase
    .from("journey_bites")
    .select("id, trip_id, dish_name, description, restaurant_name, restaurant_address, review_url, photo_path, eaten_on, created_at")
    .order("eaten_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingJourneyBitesTableError(error)) {
      return { items: [], setupRequired: true };
    }

    console.error("Error loading journey bites:", error);
    return { items: [], setupRequired: false };
  }

  const rows = (data ?? []) as JourneyBiteRow[];
  if (!rows.length) {
    return { items: [], setupRequired: false };
  }

  const uniqueTripIds = [...new Set(rows.map((row) => row.trip_id).filter(Boolean))];
  let tripsById = new Map<string, TripLookupRow>();

  if (uniqueTripIds.length) {
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("id, title, destination, start_date, end_date")
      .in("id", uniqueTripIds);

    if (tripError) {
      console.error("Error loading trips for journey bites:", tripError);
    } else {
      tripsById = new Map(((tripData ?? []) as TripLookupRow[]).map((trip) => [trip.id, trip]));
    }
  }

  const items: JourneyBite[] = rows.map((row) => {
    const relatedTrip = tripsById.get(row.trip_id) ?? null;

    return {
      id: row.id,
      tripId: row.trip_id,
      dishName: row.dish_name,
      description: row.description ?? "",
      restaurantName: row.restaurant_name ?? "",
      restaurantAddress: row.restaurant_address ?? "",
      reviewUrl: row.review_url ?? "",
      photoUrl: resolvePhotoUrl(row.photo_path),
      eatenOn: row.eaten_on ?? "",
      createdAt: row.created_at,
      trip: relatedTrip
        ? {
            id: relatedTrip.id,
            title: relatedTrip.title,
            destination: relatedTrip.destination,
            startDate: relatedTrip.start_date,
            endDate: relatedTrip.end_date,
          }
        : null,
    };
  });

  return { items, setupRequired: false };
}

export async function loadJourneyBiteById(id: string): Promise<JourneyBite | null> {
  const { data, error } = await supabase
    .from("journey_bites")
    .select("id, trip_id, dish_name, description, restaurant_name, restaurant_address, review_url, photo_path, eaten_on, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as JourneyBiteRow | null;
  if (!row) return null;

  let trip: JourneyBite["trip"] = null;
  if (row.trip_id) {
    const { data: tripRow, error: tripError } = await supabase
      .from("trips")
      .select("id, title, destination, start_date, end_date")
      .eq("id", row.trip_id)
      .maybeSingle();

    if (tripError) {
      throw new Error(tripError.message);
    }

    if (tripRow) {
      const t = tripRow as TripLookupRow;
      trip = {
        id: t.id,
        title: t.title,
        destination: t.destination,
        startDate: t.start_date,
        endDate: t.end_date,
      };
    }
  }

  const item = mapRowToJourneyBite(row);
  return { ...item, trip };
}

export async function createJourneyBite(input: JourneyBiteInput): Promise<JourneyBite> {
  const { data, error } = await supabase
    .from("journey_bites")
    .insert(toInsertRow(input))
    .select("id, trip_id, dish_name, description, restaurant_name, restaurant_address, review_url, photo_path, eaten_on, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToJourneyBite(data as JourneyBiteRow);
}

export async function updateJourneyBite(id: string, changes: JourneyBiteUpdate): Promise<JourneyBite> {
  const payload = toUpdateRow(changes);
  const { data, error } = await supabase
    .from("journey_bites")
    .update(payload)
    .eq("id", id)
    .select("id, trip_id, dish_name, description, restaurant_name, restaurant_address, review_url, photo_path, eaten_on, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToJourneyBite(data as JourneyBiteRow);
}

export async function deleteJourneyBite(id: string): Promise<void> {
  const { data: row, error: rowError } = await supabase
    .from("journey_bites")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle();

  if (rowError) {
    throw new Error(rowError.message);
  }

  const photoPath = getJourneyBitePhotoPath((row as { photo_path?: string | null } | null)?.photo_path ?? null);
  if (photoPath) {
    const { data: removedData, error: removeError } = await supabase.storage
      .from(JOURNEY_BITES_BUCKET)
      .remove([photoPath]);

    if (removeError) {
      throw new Error(removeError.message);
    }

    const objectError = removedData?.find((item) => item.error)?.error;
    if (objectError) {
      throw new Error(objectError);
    }
  }

  const { error } = await supabase
    .from("journey_bites")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadJourneyBitePhoto(file: File): Promise<{ path: string; publicUrl: string }> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `foods/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(JOURNEY_BITES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(JOURNEY_BITES_BUCKET).getPublicUrl(filePath);

  return { path: filePath, publicUrl: data.publicUrl };
}

export async function convertTripFoodToJourneyBite(params: {
  tripId: string;
  food: TripFood;
  foodIndex: number;
  fallbackDate?: string;
}): Promise<{ created: boolean; item: JourneyBite | null }> {
  const { tripId, food, foodIndex, fallbackDate } = params;

  const foodName = food.name?.trim();
  if (!foodName) {
    return { created: false, item: null };
  }

  const { data: existing, error: existingError } = await supabase
    .from("journey_bites")
    .select("id, trip_id, dish_name, description, restaurant_name, restaurant_address, review_url, photo_path, eaten_on, created_at")
    .eq("trip_id", tripId)
    .eq("source_food_index", foodIndex)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return { created: false, item: mapRowToJourneyBite(existing as JourneyBiteRow) };
  }

  const { data, error } = await supabase
    .from("journey_bites")
    .insert({
      trip_id: tripId,
      source_food_index: foodIndex,
      dish_name: foodName,
      description: toNullableTrimmed(food.description),
      restaurant_address: null,
      review_url: toNullableTrimmed(food.reviewUrl),
      photo_path: ensurePublicPath(food.image),
      eaten_on: toNullableTrimmed(fallbackDate),
      sort_order: foodIndex,
    })
    .select("id, trip_id, dish_name, description, restaurant_name, restaurant_address, review_url, photo_path, eaten_on, created_at")
    .single();

  if (error) {
    if (isConflictError(error)) {
      const { data: conflictRow } = await supabase
        .from("journey_bites")
        .select("id, trip_id, dish_name, description, restaurant_name, restaurant_address, review_url, photo_path, eaten_on, created_at")
        .eq("trip_id", tripId)
        .eq("source_food_index", foodIndex)
        .maybeSingle();

      return {
        created: false,
        item: conflictRow ? mapRowToJourneyBite(conflictRow as JourneyBiteRow) : null,
      };
    }

    throw new Error(error.message);
  }

  return { created: true, item: mapRowToJourneyBite(data as JourneyBiteRow) };
}

export async function loadJourneyBitePhotoThumbnailsByTrip(tripIds: string[]): Promise<Record<string, string[]>> {
  if (!tripIds.length) return {};

  const { data, error } = await supabase
    .from("journey_bites")
    .select("trip_id, photo_path, eaten_on, sort_order, created_at")
    .in("trip_id", tripIds)
    .not("photo_path", "is", null)
    .order("eaten_on", { ascending: false, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingJourneyBitesTableError(error)) {
      return {};
    }

    console.error("Error loading journey bite thumbnails:", error);
    return {};
  }

  const grouped: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const tripId = String((row as { trip_id?: unknown }).trip_id ?? "");
    const photoPath = (row as { photo_path?: string | null }).photo_path ?? null;
    if (!tripId || !photoPath) continue;

    const url = resolvePhotoUrl(photoPath);
    if (!url) continue;

    grouped[tripId] ??= [];
    if (grouped[tripId].length < 6) {
      grouped[tripId].push(url);
    }
  }

  return grouped;
}
