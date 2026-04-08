import { supabase } from "@/lib/supabase";
import {
  FlightLeg,
  Trip,
  TripExpense,
  TripFood,
  TripHotel,
  TripTicket,
  TripTravel,
} from "@/features/trips/types/trip";

const TRIP_PHOTOS_BUCKET = "trip-photos";
const JOURNEY_BITES_BUCKET = "journey-bites";

type TripRow = {
  id: string;
  title: string;
  destination: string;
  destinations: unknown;
  start_date: string;
  end_date: string;
  cost: number | null;
  photos: unknown;
  hotels: unknown;
  foods: unknown;
  notes: string | null;
  tags: unknown;
  travel: unknown;
  tickets: unknown;
  expenses: unknown;
  created_at: string;
  updated_at: string;
};

type TripUpdateInput = Partial<Omit<Trip, "id" | "createdAt" | "updatedAt">>;

const isMissingDestinationsColumnError = (error: { message?: string } | null) => {
  const message = error?.message ?? "";
  return /destinations/i.test(message) && /does not exist/i.test(message);
};

const isMissingJourneyBitesTableError = (error: { message?: string } | null) => {
  const message = error?.message ?? "";
  return /journey_bites/i.test(message) && /does not exist/i.test(message);
};

const getStoragePathFromUrl = (source: string, bucket: string) => {
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/object/public/${bucket}/`,
    `/object/sign/${bucket}/`,
  ];

  for (const marker of markers) {
    const markerIndex = source.indexOf(marker);
    if (markerIndex === -1) continue;

    const rawPath = source.slice(markerIndex + marker.length).split("?")[0];
    if (rawPath) return decodeURIComponent(rawPath);
  }

  return null;
};

const resolveTripBucketPath = (value: string, bucket: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return getStoragePathFromUrl(trimmed, bucket);
};

const stripDestinationsField = <T extends Record<string, unknown>>(payload: T): T => {
  const next = { ...payload };
  delete next.destinations;
  return next;
};

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
};

const parseNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toSortableDate = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const sortHotelsByDate = (items: TripHotel[]) => [...items].sort((left, right) => {
  const leftCheckIn = toSortableDate(left.checkIn);
  const rightCheckIn = toSortableDate(right.checkIn);

  if (leftCheckIn !== rightCheckIn) {
    return leftCheckIn - rightCheckIn;
  }

  const leftCheckOut = toSortableDate(left.checkOut);
  const rightCheckOut = toSortableDate(right.checkOut);

  if (leftCheckOut !== rightCheckOut) {
    return leftCheckOut - rightCheckOut;
  }

  return left.name.localeCompare(right.name, "pt-PT");
});

const parseFlightLegs = (value: unknown): FlightLeg[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      from: String(item.from ?? "").trim(),
      to: String(item.to ?? "").trim(),
      departure: String(item.departure ?? "").trim(),
      arrival: String(item.arrival ?? "").trim(),
      carrier: item.carrier ? String(item.carrier).trim() : undefined,
      flightNumber: item.flightNumber ? String(item.flightNumber).trim() : undefined,
    }))
    .filter((item) => item.from && item.to);
};

const parseHotels = (value: unknown): TripHotel[] => {
  if (!Array.isArray(value)) return [];

  return sortHotelsByDate(value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      link: item.link ? String(item.link).trim() : undefined,
      address: item.address ? String(item.address).trim() : undefined,
      checkIn: item.checkIn ? String(item.checkIn).trim() : undefined,
      checkOut: item.checkOut ? String(item.checkOut).trim() : undefined,
      cost: item.cost != null ? parseNumber(item.cost, 0) : undefined,
      confirmationNumber: item.confirmationNumber ? String(item.confirmationNumber).trim() : undefined,
      phone: item.phone ? String(item.phone).trim() : undefined,
    }))
    .filter((item) => item.name));
};

const parseFoods = (value: unknown): TripFood[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      description: item.description ? String(item.description).trim() : undefined,
      image: item.image ? String(item.image).trim() : undefined,
      reviewUrl: item.reviewUrl ? String(item.reviewUrl).trim() : undefined,
    }))
    .filter((item) => item.name);
};

const parseTickets = (value: unknown): TripTicket[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      venue: item.venue ? String(item.venue).trim() : undefined,
      address: item.address ? String(item.address).trim() : undefined,
      seats: item.seats ? String(item.seats).trim() : undefined,
      cost: item.cost != null ? parseNumber(item.cost, 0) : undefined,
    }))
    .filter((item) => item.name);
};

const parseExpenses = (value: unknown): TripExpense[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      label: String(item.label ?? "").trim(),
      amount: parseNumber(item.amount, 0),
    }))
    .filter((item) => item.label);
};

const parseTravel = (value: unknown): TripTravel | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const payload = value as Record<string, unknown>;

  const outbound = parseFlightLegs(payload.outbound);
  const returnTrip = parseFlightLegs(payload.returnTrip);

  if (!outbound.length && !returnTrip.length) {
    return undefined;
  }

  return {
    outbound,
    returnTrip,
    cost: payload.cost != null ? parseNumber(payload.cost, 0) : undefined,
  };
};

const mapRowToTrip = (row: TripRow): Trip => ({
  id: row.id,
  title: row.title,
  destination: row.destination,
  destinations: parseStringArray(row.destinations).length
    ? parseStringArray(row.destinations)
    : [row.destination],
  startDate: row.start_date,
  endDate: row.end_date,
  cost: parseNumber(row.cost, 0),
  photos: parseStringArray(row.photos),
  hotels: parseHotels(row.hotels),
  foods: parseFoods(row.foods),
  notes: row.notes ?? "",
  tags: parseStringArray(row.tags),
  travel: parseTravel(row.travel),
  tickets: parseTickets(row.tickets),
  expenses: parseExpenses(row.expenses),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapTripToRow = (trip: Trip) => ({
  id: trip.id,
  title: trip.title,
  destination: trip.destination,
  destinations: trip.destinations?.length ? trip.destinations : [trip.destination],
  start_date: trip.startDate,
  end_date: trip.endDate,
  cost: trip.cost,
  photos: trip.photos,
  hotels: trip.hotels,
  foods: trip.foods,
  notes: trip.notes,
  tags: trip.tags,
  travel: trip.travel ?? null,
  tickets: trip.tickets ?? [],
  expenses: trip.expenses ?? [],
  created_at: trip.createdAt,
  updated_at: trip.updatedAt,
});

const mapTripUpdateToRow = (changes: TripUpdateInput, updatedAt: string) => {
  const row: Record<string, unknown> = {
    updated_at: updatedAt,
  };

  if (changes.title !== undefined) row.title = changes.title;
  if (changes.destination !== undefined) row.destination = changes.destination;
  if (changes.destinations !== undefined) row.destinations = changes.destinations;
  if (changes.startDate !== undefined) row.start_date = changes.startDate;
  if (changes.endDate !== undefined) row.end_date = changes.endDate;
  if (changes.cost !== undefined) row.cost = changes.cost;
  if (changes.photos !== undefined) row.photos = changes.photos;
  if (changes.hotels !== undefined) row.hotels = changes.hotels;
  if (changes.foods !== undefined) row.foods = changes.foods;
  if (changes.notes !== undefined) row.notes = changes.notes;
  if (changes.tags !== undefined) row.tags = changes.tags;
  if (Object.prototype.hasOwnProperty.call(changes, "travel")) {
    row.travel = changes.travel ?? null;
  }
  if (changes.tickets !== undefined) row.tickets = changes.tickets;
  if (changes.expenses !== undefined) row.expenses = changes.expenses;

  return row;
};

export async function loadTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error loading trips:", error);
    return [];
  }

  return (data ?? []).map((row) => mapRowToTrip(row as TripRow));
}

export async function createTrip(tripData: Omit<Trip, "id" | "createdAt" | "updatedAt">): Promise<Trip> {
  const now = new Date().toISOString();
  const trip: Trip = {
    ...tripData,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  let { data, error } = await supabase
    .from("trips")
    .insert(mapTripToRow(trip))
    .select("*")
    .single();

  if (isMissingDestinationsColumnError(error)) {
    const fallbackPayload = stripDestinationsField(mapTripToRow(trip));
    const retry = await supabase
      .from("trips")
      .insert(fallbackPayload)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("Error creating trip:", error);
    throw new Error(`Failed to create trip: ${error.message}`);
  }

  return mapRowToTrip(data as TripRow);
}

export async function updateTrip(id: string, changes: TripUpdateInput): Promise<{ updatedAt: string }> {
  const updatedAt = new Date().toISOString();
  const payload = mapTripUpdateToRow(changes, updatedAt);

  let { error } = await supabase
    .from("trips")
    .update(payload)
    .eq("id", id);

  if (isMissingDestinationsColumnError(error)) {
    const fallbackPayload = stripDestinationsField(payload);
    const retry = await supabase
      .from("trips")
      .update(fallbackPayload)
      .eq("id", id);
    error = retry.error;
  }

  if (error) {
    console.error("Error updating trip:", error);
    throw new Error(`Failed to update trip: ${error.message}`);
  }

  return { updatedAt };
}

export async function deleteTrip(id: string): Promise<void> {
  const { data: tripRow, error: tripRowError } = await supabase
    .from("trips")
    .select("photos, foods")
    .eq("id", id)
    .maybeSingle();

  if (tripRowError) {
    console.error("Error loading trip for storage cleanup:", tripRowError);
    throw new Error(`Failed to load trip for deletion: ${tripRowError.message}`);
  }

  const tripPhotos = parseStringArray((tripRow as { photos?: unknown } | null)?.photos);
  const tripFoods = parseFoods((tripRow as { foods?: unknown } | null)?.foods);
  const tripPaths = [
    ...tripPhotos,
    ...tripFoods.map((food) => food.image ?? ""),
  ]
    .map((value) => resolveTripBucketPath(value, TRIP_PHOTOS_BUCKET))
    .filter((value): value is string => Boolean(value));

  const uniqueTripPaths = [...new Set(tripPaths)];
  if (uniqueTripPaths.length) {
    const { data: removeData, error: removeError } = await supabase.storage
      .from(TRIP_PHOTOS_BUCKET)
      .remove(uniqueTripPaths);

    if (removeError) {
      console.error("Error deleting trip photos from storage:", removeError);
      throw new Error(`Failed to delete trip photos from storage: ${removeError.message}`);
    }

    const objectError = removeData?.find((item) => item.error)?.error;
    if (objectError) {
      throw new Error(objectError);
    }
  }

  const { data: journeyBiteRows, error: journeyBiteError } = await supabase
    .from("journey_bites")
    .select("photo_path")
    .eq("trip_id", id);

  if (journeyBiteError && !isMissingJourneyBitesTableError(journeyBiteError)) {
    throw new Error(`Failed to load journey bite photos: ${journeyBiteError.message}`);
  }

  const journeyBitePaths = (journeyBiteRows ?? [])
    .map((row) => (row as { photo_path?: string | null }).photo_path ?? "")
    .map((value) => resolveTripBucketPath(value, JOURNEY_BITES_BUCKET))
    .filter((value): value is string => Boolean(value));

  const uniqueJourneyBitePaths = [...new Set(journeyBitePaths)];
  if (uniqueJourneyBitePaths.length) {
    const { data: removeData, error: removeError } = await supabase.storage
      .from(JOURNEY_BITES_BUCKET)
      .remove(uniqueJourneyBitePaths);

    if (removeError) {
      throw new Error(`Failed to delete journey bite photos from storage: ${removeError.message}`);
    }

    const objectError = removeData?.find((item) => item.error)?.error;
    if (objectError) {
      throw new Error(objectError);
    }
  }

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting trip:", error);
    throw new Error(`Failed to delete trip: ${error.message}`);
  }
}
