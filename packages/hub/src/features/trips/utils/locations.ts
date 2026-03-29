import { Trip } from "@/features/trips/types/trip";

export type TripLocationSummary = {
  id: string;
  trip: Trip;
  label: string;
  query: string;
};

const ADDRESS_LABEL_EXCLUSIONS = new Set([
  "usa",
  "united states",
  "portugal",
  "espanha",
  "spain",
  "japan",
  "japao",
  "malta",
]);

const US_CITY_TO_STATE: Record<string, string> = {
  "san francisco": "California",
  "los angeles": "California",
  "las vegas": "Nevada",
  "madison": "Wisconsin",
  "chicago": "Illinois",
  "miami": "Florida",
  "philadelphia": "Pennsylvania",
  "philly": "Pennsylvania",
  "new york": "New York",
  "dallas": "Texas",
  "pasadena": "California",
};

const US_REGION_EXCLUSIONS = new Set([
  "california",
  "nevada",
  "wisconsin",
  "illinois",
  "florida",
  "pennsylvania",
  "new york",
  "texas",
  "ca",
  "nv",
  "wi",
  "il",
  "fl",
  "pa",
  "ny",
  "tx",
]);

const HOTEL_CITY_PATTERNS: Array<{ regex: RegExp; city: string }> = [
  { regex: /san\s*francisco|vintage\s*court/i, city: "San Francisco" },
  { regex: /los\s*angeles|pasadena|eagle\s*rock/i, city: "Los Angeles" },
  { regex: /las\s*vegas|mccarran/i, city: "Las Vegas" },
  { regex: /miami/i, city: "Miami" },
  { regex: /philadelphia|philly|bartram/i, city: "Philadelphia" },
  { regex: /tokyo|roppongi/i, city: "Tokyo" },
  { regex: /porto/i, city: "Porto" },
];

const HOTEL_NAME_LABEL_HINTS = [
  "hotel",
  "inn",
  "hostel",
  "resort",
  "suites",
  "guest house",
  "apartments",
  "motel",
  "lodge",
  "villa",
  "times square",
  "holiday inn",
  "yotel",
];

const PORTUGAL_LOCATION_REGEX = /\b(portugal|porto|lisboa|lisbon|coimbra|faro|braga|aveiro|maia)\b/i;
const PORTUGAL_POSTAL_CODE_REGEX = /\b\d{4}-\d{3}\b/;

export const addStateToUsLabel = (label: string): string => {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return label;

  if (label.includes(",")) {
    const [city, maybeRegion] = label.split(",").map((part) => part.trim());
    const state = US_CITY_TO_STATE[city.toLowerCase()];
    if (state && maybeRegion && !/usa|united states/i.test(maybeRegion)) {
      return `${city}, ${state}`;
    }
    return label;
  }

  const state = US_CITY_TO_STATE[normalized];
  return state ? `${label}, ${state}` : label;
};

const extractPostalCityCandidate = (value: string): string | null => {
  const match = value.match(/^\d{4,6}\s+(.+)$/);
  return match?.[1]?.trim() || null;
};

export const extractCityLabelFromAddress = (address: string): string | null => {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const rawCandidate = parts[i];
    const candidate = extractPostalCityCandidate(rawCandidate) ?? rawCandidate;
    const normalized = candidate.toLowerCase();
    if (!candidate) continue;
    if (/\d/.test(rawCandidate) && !extractPostalCityCandidate(rawCandidate)) continue;
    if (ADDRESS_LABEL_EXCLUSIONS.has(normalized)) continue;
    if (US_REGION_EXCLUSIONS.has(normalized)) continue;
    if (!/[a-zA-Z]/.test(candidate)) continue;
    return addStateToUsLabel(candidate);
  }

  return null;
};

export const inferCityLabelFromHotel = (hotelName: string): string | null => {
  const match = HOTEL_CITY_PATTERNS.find((entry) => entry.regex.test(hotelName));
  return match ? addStateToUsLabel(match.city) : null;
};

const normalizeLabel = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const isHotelLikeLabel = (label: string, hotelName: string) => {
  const normalizedLabel = normalizeLabel(label);
  const normalizedHotelName = normalizeLabel(hotelName);

  if (!normalizedLabel) return false;
  if (normalizedHotelName && (normalizedLabel === normalizedHotelName || normalizedLabel.includes(normalizedHotelName))) {
    return true;
  }

  return HOTEL_NAME_LABEL_HINTS.some((hint) => normalizedLabel.includes(hint));
};

const isPortugalLocation = (value: string): boolean => (
  PORTUGAL_LOCATION_REGEX.test(value) || PORTUGAL_POSTAL_CODE_REGEX.test(value)
);

export function getTripLocationSummaries(trips: Trip[]): TripLocationSummary[] {
  const locations: TripLocationSummary[] = [];

  trips.forEach((trip) => {
    const seen = new Set<string>();
    let addedSpecificLocation = false;
    const tripLocations: TripLocationSummary[] = [];

    const add = (query: string, label: string) => {
      const normalizedQuery = query.trim();
      const normalizedLabel = label.trim();
      if (!normalizedQuery || !normalizedLabel) return;

      const dedupeKey = normalizedQuery.toLowerCase();
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      tripLocations.push({
        id: `${trip.id}:${dedupeKey}`,
        trip,
        label: normalizedLabel,
        query: normalizedQuery,
      });
    };

    trip.hotels.forEach((hotel) => {
      if (hotel.address?.trim()) {
        const extractedLabel = extractCityLabelFromAddress(hotel.address);
        const inferredHotelCity = inferCityLabelFromHotel(hotel.name ?? "");
        const cityLabel = extractedLabel && !isHotelLikeLabel(extractedLabel, hotel.name ?? "")
          ? extractedLabel
          : inferredHotelCity ?? addStateToUsLabel(trip.destination);
        if (isPortugalLocation(hotel.address) || isPortugalLocation(cityLabel)) {
          return;
        }
        add(`${hotel.name}, ${hotel.address}`, cityLabel);
        addedSpecificLocation = true;
        return;
      }

      if (hotel.name?.trim()) {
        const inferredCityLabel = inferCityLabelFromHotel(hotel.name);
        const cityLabel = inferredCityLabel ?? trip.destination;
        if (isPortugalLocation(hotel.name) || isPortugalLocation(cityLabel)) {
          return;
        }
        const geocodeQuery = cityLabel === trip.destination
          ? `${hotel.name}, ${trip.destination}`
          : inferredCityLabel
          ? cityLabel
          : `${hotel.name}, ${cityLabel}, USA`;
        add(geocodeQuery, cityLabel);
        addedSpecificLocation = true;
      }
    });

    if (!addedSpecificLocation) {
      add(trip.destination, addStateToUsLabel(trip.destination));
    }

    // If trip has exactly one location, use trip title without year and add US state when applicable.
    if (tripLocations.length === 1) {
      const titleWithoutYear = trip.title.replace(/\s*\d{4}\s*$/, "").trim();
      tripLocations[0].label = addStateToUsLabel(titleWithoutYear);
    }

    locations.push(...tripLocations);
  });

  return locations;
}