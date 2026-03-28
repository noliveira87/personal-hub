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

type TripRow = {
  id: string;
  title: string;
  destination: string;
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

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
};

const parseNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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

  return value
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
    .filter((item) => item.name);
};

const parseFoods = (value: unknown): TripFood[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      description: item.description ? String(item.description).trim() : undefined,
      image: item.image ? String(item.image).trim() : undefined,
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

  const { data, error } = await supabase
    .from("trips")
    .insert(mapTripToRow(trip))
    .select("*")
    .single();

  if (error) {
    console.error("Error creating trip:", error);
    throw new Error(`Failed to create trip: ${error.message}`);
  }

  return mapRowToTrip(data as TripRow);
}

export async function updateTrip(trip: Trip): Promise<Trip> {
  const payload: Trip = {
    ...trip,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("trips")
    .update(mapTripToRow(payload))
    .eq("id", trip.id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating trip:", error);
    throw new Error(`Failed to update trip: ${error.message}`);
  }

  return mapRowToTrip(data as TripRow);
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting trip:", error);
    throw new Error(`Failed to delete trip: ${error.message}`);
  }
}
