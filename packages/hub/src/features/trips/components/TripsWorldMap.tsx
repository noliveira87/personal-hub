import { useEffect, useMemo, useState } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldTopology from "world-atlas/countries-110m.json";
import { MapPin, Globe2 } from "lucide-react";
import { Trip } from "@/features/trips/types/trip";

type TripsWorldMapProps = {
  trips: Trip[];
  onSelectTrip?: (trip: Trip) => void;
};

type TripPoint = {
  trip: Trip;
  lat: number;
  lng: number;
  source: "cache" | "fallback" | "geocode";
};

type CachedGeo = {
  lat: number;
  lng: number;
};

const GEO_CACHE_KEY = "trip-destination-geocode-cache-v1";

const DESTINATION_FALLBACKS: Array<{ regex: RegExp; lat: number; lng: number }> = [
  { regex: /madison|wisconsin/i, lat: 43.0731, lng: -89.4012 },
  { regex: /malta|valletta|sliema/i, lat: 35.8989, lng: 14.5146 },
  { regex: /lisboa|lisbon/i, lat: 38.7223, lng: -9.1393 },
  { regex: /porto/i, lat: 41.1579, lng: -8.6291 },
  { regex: /madrid/i, lat: 40.4168, lng: -3.7038 },
  { regex: /barcelona/i, lat: 41.3874, lng: 2.1686 },
  { regex: /london/i, lat: 51.5072, lng: -0.1276 },
  { regex: /paris/i, lat: 48.8566, lng: 2.3522 },
  { regex: /rome|roma/i, lat: 41.9028, lng: 12.4964 },
  { regex: /berlin/i, lat: 52.52, lng: 13.405 },
  { regex: /amsterdam/i, lat: 52.3676, lng: 4.9041 },
  { regex: /new york/i, lat: 40.7128, lng: -74.006 },
  { regex: /chicago/i, lat: 41.8781, lng: -87.6298 },
  { regex: /tokyo/i, lat: 35.6762, lng: 139.6503 },
  { regex: /sao paulo|s\.? paulo/i, lat: -23.5505, lng: -46.6333 },
  { regex: /rio de janeiro|rio/i, lat: -22.9068, lng: -43.1729 },
  { regex: /sydney/i, lat: -33.8688, lng: 151.2093 },
  { regex: /singapore/i, lat: 1.3521, lng: 103.8198 },
  { regex: /dubai/i, lat: 25.2048, lng: 55.2708 },
];

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

const findFallback = (destination: string): CachedGeo | null => {
  const match = DESTINATION_FALLBACKS.find((entry) => entry.regex.test(destination));
  return match ? { lat: match.lat, lng: match.lng } : null;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const geocodeDestination = async (destination: string): Promise<CachedGeo | null> => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(destination)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const payload = await response.json() as Array<{ lat?: string; lon?: string }>;
    const first = payload[0];
    if (!first?.lat || !first?.lon) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
};

export function TripsWorldMap({ trips, onSelectTrip }: TripsWorldMapProps) {
  const [pointsByTrip, setPointsByTrip] = useState<Record<string, TripPoint>>({});
  const [loading, setLoading] = useState(false);
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);

  const worldGeo = useMemo(() => {
    const topology = worldTopology as unknown as {
      objects?: { countries?: unknown };
    };
    if (!topology.objects?.countries) return null;

    return feature(topology as never, topology.objects.countries as never);
  }, []);

  const pathGenerator = useMemo(() => {
    if (!worldGeo) return null;
    const projection = geoEqualEarth().fitExtent([[10, 12], [990, 488]], worldGeo as never);
    return geoPath(projection);
  }, [worldGeo]);

  const destinations = useMemo(() => {
    const unique = new Set(trips.map((trip) => trip.destination.trim()).filter(Boolean));
    return Array.from(unique);
  }, [trips]);

  useEffect(() => {
    let cancelled = false;

    const resolveDestinations = async () => {
      if (!trips.length) {
        setPointsByTrip({});
        return;
      }

      const cache = readGeoCache();
      const destinationCoords: Record<string, { lat: number; lng: number; source: TripPoint["source"] }> = {};
      const unresolved: string[] = [];

      destinations.forEach((destination) => {
        if (cache[destination]) {
          destinationCoords[destination] = { ...cache[destination], source: "cache" };
          return;
        }

        const fallback = findFallback(destination);
        if (fallback) {
          destinationCoords[destination] = { ...fallback, source: "fallback" };
          return;
        }

        unresolved.push(destination);
      });

      const firstPass: Record<string, TripPoint> = {};
      trips.forEach((trip) => {
        const resolved = destinationCoords[trip.destination];
        if (!resolved) return;
        firstPass[trip.id] = {
          trip,
          lat: resolved.lat,
          lng: resolved.lng,
          source: resolved.source,
        };
      });
      setPointsByTrip(firstPass);

      if (!unresolved.length) return;

      setLoading(true);
      for (const destination of unresolved) {
        if (cancelled) break;

        const resolved = await geocodeDestination(destination);
        if (resolved) {
          cache[destination] = resolved;
          destinationCoords[destination] = { ...resolved, source: "geocode" };
          writeGeoCache(cache);
        }

        await wait(240);
      }

      if (cancelled) return;

      const finalPass: Record<string, TripPoint> = {};
      trips.forEach((trip) => {
        const resolved = destinationCoords[trip.destination];
        if (!resolved) return;
        finalPass[trip.id] = {
          trip,
          lat: resolved.lat,
          lng: resolved.lng,
          source: resolved.source,
        };
      });
      setPointsByTrip(finalPass);
      setLoading(false);
    };

    void resolveDestinations();

    return () => {
      cancelled = true;
    };
  }, [destinations, trips]);

  const points = useMemo(() => Object.values(pointsByTrip), [pointsByTrip]);
  const unresolvedCount = trips.length - points.length;
  const mapFeatures = useMemo(() => {
    if (!worldGeo || !("features" in worldGeo) || !Array.isArray(worldGeo.features)) {
      return [] as Array<{ d: string; id: string }>;
    }

    if (!pathGenerator) return [] as Array<{ d: string; id: string }>;

    return worldGeo.features
      .map((geo, index) => ({
        d: pathGenerator(geo as never) ?? "",
        id: String((geo as { id?: string | number }).id ?? index),
      }))
      .filter((item) => item.d);
  }, [pathGenerator, worldGeo]);

  const projectedPoints = useMemo(() => {
    if (!pathGenerator?.projection()) return [] as Array<{ point: TripPoint; x: number; y: number }>;

    const projection = pathGenerator.projection();
    return points
      .map((point) => {
        const coords = projection([point.lng, point.lat]);
        if (!coords) return null;
        return {
          point,
          x: coords[0],
          y: coords[1],
        };
      })
      .filter((item): item is { point: TripPoint; x: number; y: number } => Boolean(item));
  }, [pathGenerator, points]);

  const hoveredPoint = useMemo(
    () => projectedPoints.find(({ point }) => point.trip.id === hoveredTripId) ?? null,
    [hoveredTripId, projectedPoints],
  );
  const hoveredLabelWidth = hoveredPoint ? Math.max(88, hoveredPoint.point.trip.destination.length * 7 + 18) : 0;

  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-secondary/40 to-background p-4 sm:p-5 lg:p-6 shadow-sm">
      <div className="mb-4 sm:mb-5 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-body uppercase tracking-[0.14em] text-muted-foreground">Mapa de Viagens</p>
          <h3 className="font-display text-xl sm:text-2xl text-foreground">Pegadas pelo mundo</h3>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-body text-muted-foreground bg-background/70">
          <MapPin className="h-3.5 w-3.5" />
          <span>{points.length} pins</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/70 p-2 sm:p-3">
        <svg viewBox="0 0 1000 500" className="w-full h-auto" role="img" aria-label="Mapa do mundo com pins de viagens">
          <rect x="0" y="0" width="1000" height="500" fill="hsl(var(--background))" />
          {mapFeatures.map((country) => (
            <path
              key={country.id}
              d={country.d}
              fill="hsl(var(--secondary))"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
            />
          ))}

          {projectedPoints.map(({ point, x, y }) => (
            <g
              key={point.trip.id}
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelectTrip?.(point.trip)}
              onMouseEnter={() => setHoveredTripId(point.trip.id)}
              onMouseLeave={() => setHoveredTripId((prev) => (prev === point.trip.id ? null : prev))}
              style={{
                cursor: onSelectTrip ? "pointer" : "default",
                transition: "transform 160ms ease",
              }}
            >
              <title>{point.trip.destination}</title>
              <circle
                r={hoveredTripId === point.trip.id ? "17" : "13"}
                fill="hsl(var(--accent) / 0.22)"
                style={{ transition: "r 160ms ease" }}
              />
              <circle
                r={hoveredTripId === point.trip.id ? "9.8" : "8.2"}
                fill="#ef4444"
                stroke="hsl(var(--background))"
                strokeWidth={hoveredTripId === point.trip.id ? "3.4" : "2.8"}
                style={{ transition: "r 160ms ease, stroke-width 160ms ease" }}
              />
              <circle
                r={hoveredTripId === point.trip.id ? "3.6" : "3.1"}
                fill="hsl(var(--background))"
                style={{ transition: "r 160ms ease" }}
              />
            </g>
          ))}

          {hoveredPoint && (
            <g
              transform={`translate(${hoveredPoint.x + 12}, ${hoveredPoint.y - 30})`}
              style={{ pointerEvents: "none" }}
            >
              <rect
                x="0"
                y="0"
                rx="8"
                ry="8"
                width={hoveredLabelWidth}
                height="24"
                fill="hsl(var(--foreground))"
                opacity="0.95"
              />
              <text
                x="9"
                y="16"
                fill="hsl(var(--background))"
                fontSize="12"
                fontFamily="system-ui, sans-serif"
              >
                {hoveredPoint.point.trip.destination}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1 text-[11px] font-body text-muted-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
        <span>Pin vermelho = destino visitado</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {points.slice(0, 12).map((point) => (
          <button
            key={`chip-${point.trip.id}`}
            type="button"
            onClick={() => onSelectTrip?.(point.trip)}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>{point.trip.destination}</span>
          </button>
        ))}
      </div>

      {(loading || unresolvedCount > 0) && (
        <p className="mt-3 text-xs font-body text-muted-foreground">
          {loading
            ? "A localizar destinos no mapa..."
            : `${unresolvedCount} ${unresolvedCount === 1 ? "viagem ainda sem pin" : "viagens ainda sem pin"}`}
        </p>
      )}
    </div>
  );
}
