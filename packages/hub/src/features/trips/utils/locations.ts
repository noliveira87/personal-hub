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

const PORTUGAL_DESTINATION_REGEX = /\b(portugal|portugal continental|lisboa|lisbon|porto|coimbra|faro|braga|aveiro|maia|sintra|cascais|setubal|evora|matosinhos|portalegre|vilamoura|quarteira|portimao|lagos|algarve|beja|viseu|guimaraes|viana do castelo|leiria|santarem|albufeira|tavira|sagres|nazare|obidos|tomar|alcobaca|funchal|madeira|ponta delgada|acores|azores|ilha da madeira|ilha de madeira|ilha de sao miguel|sao miguel)\b/;

const NON_PORTUGAL_DESTINATION_REGEX = /\b(brasil|brazil|porto alegre|rio de janeiro|sao paulo|espanha|spain|franca|france|italia|italy|alemanha|germany|japao|japan|usa|united states|estados unidos|reino unido|united kingdom|england|holanda|netherlands|malta)\b/;

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

const INTERNATIONAL_SCOPE_TAG = "scope:international";
const DOMESTIC_SCOPE_TAG = "scope:domestic";

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
  const primaryDestination = (trip.destinations?.find((value) => value.trim()) ?? trip.destination).trim();
  if (!trimmedTitle) return getLocalizedTripDestination(primaryDestination, language);

  const yearMatch = trimmedTitle.match(/\s*\d{4}\s*$/);
  const yearSuffix = yearMatch?.[0]?.trim() ?? "";
  const titleWithoutYear = trimmedTitle.replace(/\s*\d{4}\s*$/, "").trim();
  const localizedDestination = getLocalizedTripDestination(primaryDestination, language);

  if (!titleWithoutYear) {
    return yearSuffix ? `${localizedDestination} ${yearSuffix}` : localizedDestination;
  }

  const normalizedTitle = normalizeDestinationKey(titleWithoutYear);
  const normalizedDestination = normalizeDestinationKey(primaryDestination);
  const normalizedDestinationWithState = normalizeDestinationKey(addStateToUsLabel(primaryDestination));

  if (
    normalizedTitle === normalizedDestination
    || normalizedTitle === normalizedDestinationWithState
  ) {
    return yearSuffix ? `${localizedDestination} ${yearSuffix}` : localizedDestination;
  }

  let localizedTitle = localizeLocationTermsInText(titleWithoutYear, language);
  const replacementCandidates = [addStateToUsLabel(primaryDestination), primaryDestination]
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

export const isPortugalDestination = (destination: string) => {
  const normalized = normalizeDestinationKey(destination);
  if (!normalized) return false;

  if (normalized.includes("portugal")) {
    return true;
  }

  if (NON_PORTUGAL_DESTINATION_REGEX.test(normalized)) {
    return false;
  }

  return PORTUGAL_DESTINATION_REGEX.test(normalized);
};

const isPortugalLocationLabel = (label: string) => isPortugalDestination(label);

const isPortugalLocation = (location: Pick<TripLocationSummary, "label" | "query">) => {
  return isPortugalLocationLabel(location.label) || isPortugalDestination(location.query);
};

const prefersTripDestinationLabel = (destination: string) => {
  const normalizedDestination = normalizeDestinationKey(destination);
  return COUNTRY_LABEL_DESTINATION_TOKENS.some((token) => normalizedDestination.includes(token));
};

const formatTripDestinationForCounting = (destination: string) => addStateToUsLabel(destination.trim());

export const getTripDestinations = (trip: Trip): string[] => {
  const explicit = (trip.destinations ?? []).map((value) => value.trim()).filter(Boolean);
  if (explicit.length > 0) {
    return explicit;
  }
  const fallback = trip.destination?.trim();
  return fallback ? [fallback] : [];
};

const normalizeTripTag = (value: string) => value.trim().toLowerCase();

const hasTag = (trip: Trip, tag: string) => trip.tags.some((value) => normalizeTripTag(value) === tag);

export function isInternationalTrip(trip: Trip): boolean {
  if (hasTag(trip, DOMESTIC_SCOPE_TAG)) {
    return false;
  }

  if (hasTag(trip, INTERNATIONAL_SCOPE_TAG)) {
    return true;
  }

  return getTripDestinations(trip).some((destination) => !isPortugalDestination(destination));
}

export function getTripsOutsidePortugalCount(trips: Trip[]): number {
  return trips.filter(isInternationalTrip).length;
}

export function getCountedTripLocations(trips: Trip[]): TripLocationSummary[] {
  return trips
    .filter(isInternationalTrip)
    .flatMap((trip) => {
      const countedLocations = getTripLocationSummaries([trip])
        .filter((location) => !isPortugalLocation(location));

      if (countedLocations.length > 0) {
        return countedLocations;
      }

      const fallbackLabel = formatTripDestinationForCounting(getTripDestinations(trip)[0] ?? trip.destination);
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

    getTripDestinations(trip).forEach((destination, index) => {
      const label = addStateToUsLabel(destination);
      add(label, label);

      if (index === 0 && tripLocations.length === 1 && prefersTripDestinationLabel(destination)) {
        tripLocations[0].label = label;
      }
    });

    locations.push(...tripLocations);
  });

  return locations;
}