import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CircleAlert,
  ExternalLink,
  Loader2,
  Map,
  Navigation,
  UtensilsCrossed,
} from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import AppSectionHeader from "@/components/AppSectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/I18nProvider";
import { JourneyBite, loadJourneyBites } from "@/lib/journeyBites";

type BitePoint = {
  id: string;
  bite: JourneyBite;
  lat: number;
  lng: number;
  source: "url" | "cache" | "fallback" | "geocode";
};

type CachedGeo = {
  lat: number;
  lng: number;
};

type ExcludedBite = {
  id: string;
  dishName: string;
  restaurantName: string;
  restaurantAddress: string;
  reason: "missingRestaurant" | "missingAddress" | "noResolvableCoordinates";
};

type GeoBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const GEO_CACHE_KEY = "journey-bites-map-geocode-cache-v4";
const WORLD_DEFAULT_CENTER: [number, number] = [20, 0];
const WORLD_DEFAULT_ZOOM = 2;

const PORTUGAL_CITY_FALLBACKS: Array<{ regex: RegExp; lat: number; lng: number }> = [
  { regex: /lisboa|lisbon/i, lat: 38.7223, lng: -9.1393 },
  { regex: /porto/i, lat: 41.1579, lng: -8.6291 },
  { regex: /santarem|santarem|santarém/i, lat: 39.2369, lng: -8.6849 },
  { regex: /setubal|setúbal/i, lat: 38.5244, lng: -8.8882 },
  { regex: /coimbra/i, lat: 40.2033, lng: -8.4103 },
  { regex: /aveiro/i, lat: 40.6405, lng: -8.6538 },
  { regex: /braga/i, lat: 41.5503, lng: -8.4200 },
  { regex: /faro/i, lat: 37.0194, lng: -7.9322 },
  { regex: /evora|e?vora|évora/i, lat: 38.5714, lng: -7.9135 },
  { regex: /leiria/i, lat: 39.7444, lng: -8.8072 },
  { regex: /viana do castelo/i, lat: 41.6918, lng: -8.8340 },
  { regex: /funchal|madeira/i, lat: 32.6669, lng: -16.9241 },
  { regex: /ponta delgada|acores|açores|azores/i, lat: 37.7412, lng: -25.6756 },
];

const PORTUGAL_STREET_FALLBACKS: Array<{ regex: RegExp; lat: number; lng: number }> = [
  // Santarem - Rua Elias Garcia area
  { regex: /(?:r\.?|rua)\s*elias\s*garcia.*santarem/i, lat: 39.23455, lng: -8.68499 },
];

const GLOBAL_CITY_FALLBACKS: Array<{ regex: RegExp; lat: number; lng: number }> = [
  { regex: /tokyo|toquio|taito|asakusa|minato|japan|japao|japão/i, lat: 35.6762, lng: 139.6503 },
  { regex: /kyoto/i, lat: 35.0116, lng: 135.7681 },
  { regex: /osaka/i, lat: 34.6937, lng: 135.5023 },
  { regex: /new york|nova iorque|manhattan|brooklyn/i, lat: 40.7128, lng: -74.0060 },
  { regex: /san francisco/i, lat: 37.7749, lng: -122.4194 },
  { regex: /los angeles/i, lat: 34.0522, lng: -118.2437 },
  { regex: /miami/i, lat: 25.7617, lng: -80.1918 },
  { regex: /paris/i, lat: 48.8566, lng: 2.3522 },
  { regex: /london/i, lat: 51.5072, lng: -0.1276 },
  { regex: /berlin/i, lat: 52.5200, lng: 13.4050 },
  { regex: /madrid/i, lat: 40.4168, lng: -3.7038 },
  { regex: /barcelona/i, lat: 41.3874, lng: 2.1686 },
  { regex: /cagliari/i, lat: 39.2238, lng: 9.1217 },
  { regex: /rome|roma|italy|italia|itália|milan|milano|naples|napoli/i, lat: 41.9028, lng: 12.4964 },
];

const resolveAddressBasedFallback = (normalizedAddress: string): CachedGeo | null => {
  const streetMatch = PORTUGAL_STREET_FALLBACKS.find((entry) => entry.regex.test(normalizedAddress));
  if (streetMatch) {
    return { lat: streetMatch.lat, lng: streetMatch.lng };
  }

  return null;
};

const resolveCityBasedFallback = (normalizedAddress: string): CachedGeo | null => {
  const globalMatch = GLOBAL_CITY_FALLBACKS.find((entry) => entry.regex.test(normalizedAddress));
  if (globalMatch) {
    return { lat: globalMatch.lat, lng: globalMatch.lng };
  }

  const portugalMatch = PORTUGAL_CITY_FALLBACKS.find((entry) => entry.regex.test(normalizedAddress));
  if (portugalMatch) {
    return { lat: portugalMatch.lat, lng: portugalMatch.lng };
  }

  return null;
};

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const readGeoCache = (): Record<string, CachedGeo> => {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CachedGeo>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeGeoCache = (cache: Record<string, CachedGeo>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
};

const clampCoordinate = (value: number, min: number, max: number) => value >= min && value <= max;

const coordinateInBounds = (coords: CachedGeo, bounds: GeoBounds) =>
  coords.lat >= bounds.minLat &&
  coords.lat <= bounds.maxLat &&
  coords.lng >= bounds.minLng &&
  coords.lng <= bounds.maxLng;

const inferExpectedBounds = (text: string): GeoBounds | null => {
  if (/tokyo|toquio|asakusa|taito/i.test(text)) {
    return { minLat: 35.4, maxLat: 35.9, minLng: 139.4, maxLng: 140.1 };
  }

  if (/kyoto/i.test(text)) {
    return { minLat: 34.8, maxLat: 35.3, minLng: 135.4, maxLng: 136.1 };
  }

  if (/osaka/i.test(text)) {
    return { minLat: 34.4, maxLat: 35.0, minLng: 135.1, maxLng: 135.9 };
  }

  if (/japan|japao|japão|tokyo|kyoto|osaka|taito|asakusa/i.test(text)) {
    return { minLat: 24, maxLat: 46.5, minLng: 123, maxLng: 146.5 };
  }

  if (/portugal|lisboa|lisbon|porto|coimbra|faro|braga|setubal|setúbal|santarem|santarém/i.test(text)) {
    return { minLat: 36.7, maxLat: 42.2, minLng: -10, maxLng: -6 };
  }

  if (/italy|italia|itália|rome|roma|milan|milano|naples|napoli|cagliari/i.test(text)) {
    return { minLat: 35.2, maxLat: 47.5, minLng: 6, maxLng: 19.5 };
  }

  return null;
};

const sanitizeCoordsByAddress = (coords: CachedGeo, bite: JourneyBite): CachedGeo | null => {
  const hintText = [bite.restaurantAddress, bite.trip?.destination, bite.restaurantName]
    .map((value) => value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "")
    .join(" ");

  const expectedBounds = inferExpectedBounds(hintText);
  if (!expectedBounds) return coords;

  return coordinateInBounds(coords, expectedBounds) ? coords : null;
};

const parseCoordinatePair = (latRaw?: string | null, lngRaw?: string | null): CachedGeo | null => {
  if (!latRaw || !lngRaw) return null;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!clampCoordinate(lat, -90, 90) || !clampCoordinate(lng, -180, 180)) return null;

  return { lat, lng };
};

const extractCoordsFromText = (value: string): CachedGeo | null => {
  const match = value.match(/(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  return parseCoordinatePair(match[1], match[2]);
};

const hasDetailedAddress = (value: string) => /\d/.test(value) || value.trim().length >= 12;

const extractCoordsFromReviewUrl = (reviewUrl: string): CachedGeo | null => {
  if (!reviewUrl) return null;

  const googleDataMatch = reviewUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (googleDataMatch) {
    const parsed = parseCoordinatePair(googleDataMatch[1], googleDataMatch[2]);
    if (parsed) {
      return parsed;
    }
  }

  const qMatch = reviewUrl.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) {
    const parsed = parseCoordinatePair(qMatch[1], qMatch[2]);
    if (parsed) {
      return parsed;
    }
  }

  try {
    const parsedUrl = new URL(reviewUrl);
    const queryValue = parsedUrl.searchParams.get("q") ?? parsedUrl.searchParams.get("query") ?? parsedUrl.searchParams.get("ll");
    if (queryValue) {
      const [latRaw, lngRaw] = queryValue.split(",").map((part) => part.trim());
      const parsed = parseCoordinatePair(latRaw, lngRaw);
      if (parsed) {
        return parsed;
      }
    }
  } catch {
    // Ignore invalid URL parsing.
  }

  // Keep @lat,lng as last resort because it often points to map viewport center,
  // not to the exact place marker.
  const atMatch = reviewUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const parsed = parseCoordinatePair(atMatch[1], atMatch[2]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const resolveBiteCoordinates = (bite: JourneyBite): { coords: CachedGeo; source: "url" | "fallback" } | null => {
  const detailedAddress = hasDetailedAddress(bite.restaurantAddress ?? "");
  const fromAddress = extractCoordsFromText(bite.restaurantAddress);
  if (fromAddress) {
    const sanitized = sanitizeCoordsByAddress(fromAddress, bite);
    if (sanitized) {
      return { coords: sanitized, source: "url" };
    }
  }

  const fromReviewUrl = extractCoordsFromReviewUrl(bite.reviewUrl);
  if (fromReviewUrl) {
    const sanitized = sanitizeCoordsByAddress(fromReviewUrl, bite);
    if (sanitized) {
      return { coords: sanitized, source: "url" };
    }
  }

  const normalizedAddress = (bite.restaurantAddress ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const streetFallback = resolveAddressBasedFallback(normalizedAddress);
  if (streetFallback) {
    return { coords: streetFallback, source: "fallback" };
  }

  if (detailedAddress) {
    // For detailed street addresses, avoid city approximations and let geocoding resolve them.
    return null;
  }

  const cityFallback = resolveCityBasedFallback(normalizedAddress);
  if (cityFallback) {
    return { coords: cityFallback, source: "fallback" };
  }

  const searchableText = [bite.restaurantAddress, bite.trip?.destination, bite.restaurantName]
    .map((value) => value?.normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "")
    .join(" ");

  const globalFallback = GLOBAL_CITY_FALLBACKS.find((entry) => entry.regex.test(searchableText));
  if (globalFallback) {
    return {
      coords: { lat: globalFallback.lat, lng: globalFallback.lng },
      source: "fallback",
    };
  }

  const portugalMatch = PORTUGAL_CITY_FALLBACKS.find((entry) => entry.regex.test(searchableText));
  if (portugalMatch) {
    return {
      coords: { lat: portugalMatch.lat, lng: portugalMatch.lng },
      source: "fallback",
    };
  }

  return null;
};

const makeGeocodeQueries = (bite: JourneyBite) => {
  const address = bite.restaurantAddress?.trim() ?? "";
  const restaurant = bite.restaurantName?.trim() ?? "";
  const destination = bite.trip?.destination?.trim() ?? "";

  const candidates = [
    address,
    [address, destination].filter(Boolean).join(", "),
    [address, restaurant].filter(Boolean).join(", "),
    [address, restaurant, destination].filter(Boolean).join(", "),
  ];

  return Array.from(new Set(candidates.filter(Boolean)));
};

const geocodeWithNominatim = async (query: string): Promise<CachedGeo | null> => {
  if (!query.trim()) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const rows = (await response.json()) as Array<{ lat?: string; lon?: string }>;
    if (!Array.isArray(rows) || !rows.length) return null;

    return parseCoordinatePair(rows[0].lat, rows[0].lon);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};

export function JourneyBitesMap() {
  const { t, formatDate } = useI18n();
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [points, setPoints] = useState<BitePoint[]>([]);
  const [items, setItems] = useState<JourneyBite[]>([]);
  const [excludedBites, setExcludedBites] = useState<ExcludedBite[]>([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      const result = await loadJourneyBites();
      if (cancelled) return;

      setItems(result.items);
      setSetupRequired(result.setupRequired);

      if (result.setupRequired || !result.items.length) {
        setPoints([]);
        setExcludedBites([]);
        setLoading(false);
        return;
      }

      setLocating(true);
      const cache = readGeoCache();
      const resolvedPoints: BitePoint[] = [];
      const excluded: ExcludedBite[] = [];

      for (const bite of result.items) {
        const hasRestaurant = Boolean(bite.restaurantName?.trim());
        const hasAddress = Boolean(bite.restaurantAddress?.trim());
        if (!hasRestaurant) {
          excluded.push({
            id: bite.id,
            dishName: bite.dishName,
            restaurantName: bite.restaurantName,
            restaurantAddress: bite.restaurantAddress,
            reason: "missingRestaurant",
          });
          continue;
        }

        if (!hasAddress) {
          excluded.push({
            id: bite.id,
            dishName: bite.dishName,
            restaurantName: bite.restaurantName,
            restaurantAddress: bite.restaurantAddress,
            reason: "missingAddress",
          });
          continue;
        }

        const geocodeQueries = makeGeocodeQueries(bite);
        const query = geocodeQueries[0] ?? "";
        const directResolution = resolveBiteCoordinates(bite);
        if (directResolution) {
          const { coords, source } = directResolution;

          resolvedPoints.push({
            id: bite.id,
            bite,
            lat: coords.lat,
            lng: coords.lng,
            source,
          });

          if (query) {
            cache[query] = coords;
          }
          continue;
        }

        if (!query) continue;

        if (cache[query]) {
          const sanitizedCached = sanitizeCoordsByAddress(cache[query], bite);
          if (sanitizedCached) {
            resolvedPoints.push({ id: bite.id, bite, lat: sanitizedCached.lat, lng: sanitizedCached.lng, source: "cache" });
            continue;
          }
          delete cache[query];
        }

        for (const candidate of geocodeQueries) {
          const geocoded = await geocodeWithNominatim(candidate);
          if (!geocoded) continue;

          const sanitizedGeocoded = sanitizeCoordsByAddress(geocoded, bite);
          if (sanitizedGeocoded) {
            cache[query || candidate] = sanitizedGeocoded;
            resolvedPoints.push({
              id: bite.id,
              bite,
              lat: sanitizedGeocoded.lat,
              lng: sanitizedGeocoded.lng,
              source: "geocode",
            });
            break;
          }
        }

        if (resolvedPoints.some((point) => point.id === bite.id)) {
          continue;
        }

        excluded.push({
          id: bite.id,
          dishName: bite.dishName,
          restaurantName: bite.restaurantName,
          restaurantAddress: bite.restaurantAddress,
          reason: "noResolvableCoordinates",
        });
      }

      writeGeoCache(cache);
      setPoints(resolvedPoints);
      setExcludedBites(excluded);
      setLocating(false);
      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const center = WORLD_DEFAULT_CENTER;

  return (
    <>
      <AppSectionHeader
        title={t("journeyBites.map.title")}
        icon={Map}
        backTo="/journey-bites"
        backLabel={t("journeyBites.backToList")}
      />
      <div className="h-16" aria-hidden="true" />

      <main className="container max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Card className="rounded-3xl border-border/70 shadow-sm overflow-hidden">
          <CardHeader className="space-y-2">
            <CardTitle>{t("journeyBites.map.subtitle")}</CardTitle>
            <CardDescription>{t("journeyBites.map.helper")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <p className="text-sm text-muted-foreground">{t("journeyBites.loading")}</p> : null}
            {locating ? (
              <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("journeyBites.map.locating")}
              </p>
            ) : null}

            {!loading && setupRequired ? (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-200">
                {t("journeyBites.setupRequired")}
              </div>
            ) : null}

            {!loading && !setupRequired && !items.length ? (
              <p className="text-sm text-muted-foreground">{t("journeyBites.empty")}</p>
            ) : null}

            {!loading && !setupRequired && items.length && !points.length ? (
              <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground inline-flex items-start gap-2">
                <CircleAlert className="h-4 w-4 mt-0.5" />
                {t("journeyBites.map.noCoordinates")}
              </div>
            ) : null}

            {!loading && !setupRequired && points.length ? (
              <>
                <div className="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-border/50">
                  <MapContainer center={center} zoom={WORLD_DEFAULT_ZOOM} minZoom={1} maxZoom={19} scrollWheelZoom className="h-full w-full" attributionControl>
                    <TileLayer
                      attribution='Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), OpenStreetMap contributors, and the GIS User Community'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                    />

                    {points.map((point) => (
                      <Marker key={point.id} position={[point.lat, point.lng]} icon={markerIcon}>
                        <Popup>
                          <div className="min-w-[210px] space-y-1.5">
                            <p className="font-semibold text-sm">{point.bite.dishName}</p>
                            <p className="text-xs text-muted-foreground">{point.bite.restaurantName || t("journeyBites.restaurantName")}</p>
                            {point.bite.restaurantAddress ? (
                              <p className="text-xs text-muted-foreground">{point.bite.restaurantAddress}</p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              {t("journeyBites.dateLabel")}: {point.bite.eatenOn ? formatDate(point.bite.eatenOn) : "-"}
                            </p>
                            {point.bite.reviewUrl ? (
                              <a
                                href={point.bite.reviewUrl.startsWith("http") ? point.bite.reviewUrl : `https://${point.bite.reviewUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                {t("journeyBites.review")}
                              </a>
                            ) : null}
                            <div className="pt-1">
                              <Link to={`/journey-bites/${point.bite.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline">
                                <Navigation className="h-3.5 w-3.5" />
                                {t("journeyBites.open")}
                              </Link>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{t("journeyBites.map.totalPins")}: </span>
                    <span className="font-semibold">{points.length}</span>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{t("journeyBites.map.withCoordinates")}: </span>
                    <span className="font-semibold">{points.length}</span>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{t("journeyBites.map.withoutCoordinates")}: </span>
                    <span className="font-semibold">{excludedBites.length}</span>
                  </div>
                </div>

                {excludedBites.length ? (
                  <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
                    <p className="text-sm font-semibold text-foreground">{t("journeyBites.map.diagnosticsTitle")}</p>
                    <div className="mt-2 space-y-2 max-h-56 overflow-auto pr-1">
                      {excludedBites.map((bite) => (
                        <div key={bite.id} className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
                          <p className="text-sm font-medium text-foreground">{bite.dishName}</p>
                          <p className="text-xs text-muted-foreground">{bite.restaurantName || "-"}</p>
                          <p className="text-xs text-muted-foreground">{bite.restaurantAddress || "-"}</p>
                          <p className="mt-1 text-xs text-amber-700">
                            {bite.reason === "missingRestaurant" ? t("journeyBites.map.reasonMissingRestaurant") : null}
                            {bite.reason === "missingAddress" ? t("journeyBites.map.reasonMissingAddress") : null}
                            {bite.reason === "noResolvableCoordinates" ? t("journeyBites.map.reasonNoCoordinates") : null}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {!loading ? (
              <div className="pt-2">
                <Button asChild variant="outline">
                  <Link to="/journey-bites">
                    <UtensilsCrossed className="mr-2 h-4 w-4" />
                    {t("journeyBites.backToList")}
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
