import { Trip } from "@/features/trips/types/trip";
import { type Language } from "@/i18n/translations";

export type TripLocationSummary = {
  id: string;
  trip: Trip;
  label: string;
  query: string;
};

const normalizeDestinationKey = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const PORTUGAL_DESTINATION_REGEX = /\b(portugal|lisboa|lisbon|porto|coimbra|faro|braga|aveiro|maia|sintra|cascais|setubal|evora|matosinhos|portalegre)\b/;

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
  "nova iorque": "New York",
  "dallas": "Texas",
  "pasadena": "California",
};

const LOCATION_TRANSLATIONS: Record<Language, Record<string, string>> = {
  pt: {
    "minato city": "Japão",
    "minato": "Japão",
    "new york": "Nova Iorque",
    "nova iorque": "Nova Iorque",
    "california": "Califórnia",
    "nevada": "Nevada",
    "wisconsin": "Wisconsin",
    "illinois": "Illinois",
    "florida": "Flórida",
    "pennsylvania": "Pensilvânia",
    "texas": "Texas",
    "philadelphia": "Filadélfia",
    "philly": "Filadélfia",
    "san francisco": "São Francisco",
    "los angeles": "Los Angeles",
    "las vegas": "Las Vegas",
    "madison": "Madison",
    "miami": "Miami",
    "dallas": "Dallas",
    "tokyo": "Tóquio",
    "berlin": "Berlim",
    "japan": "Japão",
    "japao": "Japão",
    "germany": "Alemanha",
    "alemanha": "Alemanha",
    "spain": "Espanha",
    "espanha": "Espanha",
    "united states": "Estados Unidos",
    "usa": "Estados Unidos",
  },
  en: {
    "minato city": "Japan",
    "minato": "Japan",
    "new york": "New York",
    "nova iorque": "New York",
    "california": "California",
    "nevada": "Nevada",
    "wisconsin": "Wisconsin",
    "illinois": "Illinois",
    "florida": "Florida",
    "pennsylvania": "Pennsylvania",
    "pensilvania": "Pennsylvania",
    "texas": "Texas",
    "filadelfia": "Philadelphia",
    "philadelphia": "Philadelphia",
    "sao francisco": "San Francisco",
    "san francisco": "San Francisco",
    "los angeles": "Los Angeles",
    "las vegas": "Las Vegas",
    "madison": "Madison",
    "miami": "Miami",
    "dallas": "Dallas",
    "berlim": "Berlin",
    "berlin": "Berlin",
    "toquio": "Tokyo",
    "tokyo": "Tokyo",
    "japao": "Japan",
    "japan": "Japan",
    "alemanha": "Germany",
    "germany": "Germany",
    "espanha": "Spain",
    "spain": "Spain",
    "estados unidos": "United States",
    "united states": "United States",
    "usa": "United States",
  },
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

const COUNTRY_LABEL_DESTINATION_TOKENS = [
  "japan",
  "japao",
] as const;

const LOCATION_TEXT_PATTERNS: Array<{ regex: RegExp; key: string }> = [
  { regex: /\b(minato city|minato)\b/gi, key: "minato city" },
  { regex: /\b(nova iorque|new york)\b/gi, key: "new york" },
  { regex: /\b(sao francisco|são francisco|san francisco)\b/gi, key: "san francisco" },
  { regex: /\b(filadelfia|filadélfia|philadelphia|philly)\b/gi, key: "philadelphia" },
  { regex: /\b(california|califórnia)\b/gi, key: "california" },
  { regex: /\b(florida|flórida)\b/gi, key: "florida" },
  { regex: /\b(pensilvania|pensilvânia|pennsylvania)\b/gi, key: "pennsylvania" },
  { regex: /\b(berlim|berlin)\b/gi, key: "berlin" },
  { regex: /\b(toquio|tóquio|tokyo)\b/gi, key: "tokyo" },
  { regex: /\b(japao|japão|japan)\b/gi, key: "japan" },
  { regex: /\b(alemanha|germany)\b/gi, key: "germany" },
  { regex: /\b(espanha|spain)\b/gi, key: "spain" },
  { regex: /\b(estados unidos|united states|usa)\b/gi, key: "united states" },
];


export const addStateToUsLabel = (label: string): string => {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return label;

  if (label.includes(",")) {
    const [city] = label.split(",").map((part) => part.trim());
    const state = US_CITY_TO_STATE[city.toLowerCase()];
    if (state) {
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

const translateLocationPart = (value: string, language: Language) => {
  const normalizedValue = normalizeDestinationKey(value);
  return LOCATION_TRANSLATIONS[language][normalizedValue] ?? value;
};

const localizeLocationTermsInText = (value: string, language: Language) => {
  let localizedValue = value;

  LOCATION_TEXT_PATTERNS.forEach(({ regex, key }) => {
    const replacement = LOCATION_TRANSLATIONS[language][key];
    if (!replacement) return;
    localizedValue = localizedValue.replace(regex, replacement);
  });

  return localizedValue;
};

export function localizeTripLocationLabel(label: string, language: Language): string {
  const normalizedLabel = normalizeDestinationKey(label);
  if (!normalizedLabel) return label;

  if (LOCATION_TRANSLATIONS[language][normalizedLabel]) {
    return LOCATION_TRANSLATIONS[language][normalizedLabel];
  }

  return label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => translateLocationPart(part, language))
    .join(", ");
}

export function getLocalizedTripDestination(destination: string, language: Language): string {
  return localizeTripLocationLabel(addStateToUsLabel(destination.trim()), language);
}

export function getLocalizedTripTitle(trip: Trip, language: Language): string {
  const trimmedTitle = trip.title.trim();
  if (!trimmedTitle) return getLocalizedTripDestination(trip.destination, language);

  const yearMatch = trimmedTitle.match(/\s*\d{4}\s*$/);
  const yearSuffix = yearMatch?.[0]?.trim() ?? "";
  const titleWithoutYear = trimmedTitle.replace(/\s*\d{4}\s*$/, "").trim();
  const localizedDestination = getLocalizedTripDestination(trip.destination, language);

  if (!titleWithoutYear) {
    return yearSuffix ? `${localizedDestination} ${yearSuffix}` : localizedDestination;
  }

  const normalizedTitle = normalizeDestinationKey(titleWithoutYear);
  const normalizedDestination = normalizeDestinationKey(trip.destination);
  const normalizedDestinationWithState = normalizeDestinationKey(addStateToUsLabel(trip.destination));

  if (
    normalizedTitle === normalizedDestination
    || normalizedTitle === normalizedDestinationWithState
  ) {
    return yearSuffix ? `${localizedDestination} ${yearSuffix}` : localizedDestination;
  }

  let localizedTitle = localizeLocationTermsInText(titleWithoutYear, language);
  const replacementCandidates = [addStateToUsLabel(trip.destination), trip.destination]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  replacementCandidates.forEach((candidate) => {
    const escapedCandidate = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    localizedTitle = localizedTitle.replace(new RegExp(escapedCandidate, "gi"), localizedDestination);
  });

  localizedTitle = localizeLocationTermsInText(localizedTitle, language);

  return yearSuffix ? `${localizedTitle} ${yearSuffix}` : localizedTitle;
}

const isPortugalDestination = (destination: string) => PORTUGAL_DESTINATION_REGEX.test(normalizeDestinationKey(destination));

const isPortugalLocationLabel = (label: string) => isPortugalDestination(label);

const isPortugalLocation = (location: Pick<TripLocationSummary, "label" | "query">) => {
  return isPortugalLocationLabel(location.label) || isPortugalDestination(location.query);
};

const prefersTripDestinationLabel = (destination: string) => {
  const normalizedDestination = normalizeDestinationKey(destination);
  return COUNTRY_LABEL_DESTINATION_TOKENS.some((token) => normalizedDestination.includes(token));
};

const formatTripDestinationForCounting = (destination: string) => addStateToUsLabel(destination.trim());

export function getTripsOutsidePortugalCount(trips: Trip[]): number {
  return trips.filter((trip) => !isPortugalDestination(trip.destination)).length;
}

export function getCountedTripLocations(trips: Trip[]): TripLocationSummary[] {
  return trips
    .filter((trip) => !isPortugalDestination(trip.destination))
    .flatMap((trip) => {
      const countedLocations = getTripLocationSummaries([trip])
        .filter((location) => !isPortugalLocation(location));

      if (countedLocations.length > 0) {
        return countedLocations;
      }

      const fallbackLabel = formatTripDestinationForCounting(trip.destination);
      return [{
        id: `${trip.id}:fallback-destination`,
        trip,
        label: fallbackLabel,
        query: fallbackLabel,
      }];
    });
}

export function getTripDestinationCount(trips: Trip[]): number {
  return getCountedTripLocations(trips).length;
}

const isHotelLikeLabel = (label: string, hotelName: string) => {
  const normalizedLabel = normalizeLabel(label);
  const normalizedHotelName = normalizeLabel(hotelName);

  if (!normalizedLabel) return false;
  if (normalizedHotelName && (normalizedLabel === normalizedHotelName || normalizedLabel.includes(normalizedHotelName))) {
    return true;
  }

  return HOTEL_NAME_LABEL_HINTS.some((hint) => normalizedLabel.includes(hint));
};

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
        const rawCityLabel = extractedLabel && !isHotelLikeLabel(extractedLabel, hotel.name ?? "")
          ? extractedLabel
          : inferredHotelCity ?? addStateToUsLabel(trip.destination);
        const cityLabel = prefersTripDestinationLabel(trip.destination)
          ? addStateToUsLabel(trip.destination)
          : rawCityLabel;
        add(`${hotel.name}, ${hotel.address}`, cityLabel);
        addedSpecificLocation = true;
        return;
      }

      if (hotel.name?.trim()) {
        const inferredCityLabel = inferCityLabelFromHotel(hotel.name);
        const rawCityLabel = inferredCityLabel ?? trip.destination;
        const cityLabel = prefersTripDestinationLabel(trip.destination)
          ? addStateToUsLabel(trip.destination)
          : rawCityLabel;
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

    if (prefersTripDestinationLabel(trip.destination)) {
      const destinationLabel = addStateToUsLabel(trip.destination);
      tripLocations.forEach((location) => {
        location.label = destinationLabel;
      });
    }

    // For single-location trips, the destination field is the source of truth for map pins.
    // This prevents stale pins when destination is edited but old hotel/address text remains.
    if (tripLocations.length === 1 && !prefersTripDestinationLabel(trip.destination)) {
      const destinationLabel = addStateToUsLabel(trip.destination);
      tripLocations[0].label = destinationLabel;
      tripLocations[0].query = destinationLabel;
    }

    locations.push(...tripLocations);
  });

  return locations;
}