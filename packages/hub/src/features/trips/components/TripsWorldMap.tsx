import { useEffect, useMemo, useRef, useState } from "react";
import { geoArea, geoContains, geoEqualEarth, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldTopology from "world-atlas/countries-110m.json";
import worldTopologyHighRes from "world-atlas/countries-50m.json";
import usStatesTopology from "us-atlas/states-10m.json";
import { MapPin, ZoomIn, ZoomOut } from "lucide-react";
import { Trip } from "@/features/trips/types/trip";
import { useI18n } from "@/i18n/I18nProvider";
import { getTripLocationSummaries, localizeTripLocationLabel } from "@/features/trips/utils/locations";

type TripsWorldMapProps = {
  trips: Trip[];
  onSelectTrip?: (trip: Trip) => void;
};

type TripPoint = {
  id: string;
  trip: Trip;
  label: string;
  query: string;
  lat: number;
  lng: number;
  source: "cache" | "fallback" | "geocode";
};

type CachedGeo = {
  lat: number;
  lng: number;
};

const GEO_CACHE_KEY = "trip-destination-geocode-cache-v1";
const USA_COUNTRY_ID = "840";

const DESTINATION_FALLBACKS: Array<{ regex: RegExp; lat: number; lng: number }> = [
  { regex: /madison|wisconsin/i, lat: 43.0731, lng: -89.4012 },
  { regex: /malta|valletta|sliema/i, lat: 35.8989, lng: 14.5146 },
  { regex: /lisboa|lisbon/i, lat: 38.7223, lng: -9.1393 },
  { regex: /porto/i, lat: 41.1579, lng: -8.6291 },
  { regex: /e?vora|évora/i, lat: 38.5714, lng: -7.9135 },
  { regex: /madrid/i, lat: 40.4168, lng: -3.7038 },
  { regex: /barcelona/i, lat: 41.3874, lng: 2.1686 },
  { regex: /london/i, lat: 51.5072, lng: -0.1276 },
  { regex: /paris/i, lat: 48.8566, lng: 2.3522 },
  { regex: /rome|roma/i, lat: 41.9028, lng: 12.4964 },
  { regex: /berlin/i, lat: 52.52, lng: 13.405 },
  { regex: /amsterdam/i, lat: 52.3676, lng: 4.9041 },
  { regex: /miami|florida/i, lat: 25.7617, lng: -80.1918 },
  { regex: /philadelphia|philly|pennsylvania|bartram/i, lat: 39.9526, lng: -75.1652 },
  { regex: /new york/i, lat: 40.7128, lng: -74.006 },
  { regex: /chicago/i, lat: 41.8781, lng: -87.6298 },
  { regex: /tokyo/i, lat: 35.6762, lng: 139.6503 },
  { regex: /sao paulo|s\.? paulo/i, lat: -23.5505, lng: -46.6333 },
  { regex: /rio de janeiro|rio/i, lat: -22.9068, lng: -43.1729 },
  { regex: /sydney/i, lat: -33.8688, lng: 151.2093 },
  { regex: /singapore/i, lat: 1.3521, lng: 103.8198 },
  { regex: /dubai/i, lat: 25.2048, lng: 55.2708 },
];

const normalizeLocationText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const PORTUGAL_QUERY_REGEX = /\b(portugal|lisboa|lisbon|porto|coimbra|faro|braga|aveiro|maia|sintra|cascais|setubal|evora)\b/i;

const matchesPortugalLocation = (value: string) => PORTUGAL_QUERY_REGEX.test(normalizeLocationText(value));

const isPortugalTripDestination = (trip: Trip) => matchesPortugalLocation(trip.destination);

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

let labelMeasureContext: CanvasRenderingContext2D | null | undefined;

const measureHoverLabelWidth = (label: string): number => {
  if (typeof document === "undefined") {
    return Math.max(80, label.length * 7);
  }

  if (labelMeasureContext === undefined) {
    const canvas = document.createElement("canvas");
    labelMeasureContext = canvas.getContext("2d");
  }

  if (!labelMeasureContext) {
    return Math.max(80, label.length * 7);
  }

  labelMeasureContext.font = "12px system-ui, sans-serif";
  return Math.ceil(labelMeasureContext.measureText(label).width + 18);
};

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
  const { t, language } = useI18n();
  const [pointsById, setPointsById] = useState<Record<string, TripPoint>>({});
  const [loading, setLoading] = useState(false);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [hoveredMap, setHoveredMap] = useState<"world" | "portugal" | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const worldGeo = useMemo(() => {
    const topology = worldTopology as unknown as {
      objects?: { countries?: unknown };
    };
    if (!topology.objects?.countries) return null;

    return feature(topology as never, topology.objects.countries as never);
  }, []);

  const worldGeoHighRes = useMemo(() => {
    const topology = worldTopologyHighRes as unknown as {
      objects?: { countries?: unknown };
    };
    if (!topology.objects?.countries) return null;

    return feature(topology as never, topology.objects.countries as never);
  }, []);

  const usStatesGeo = useMemo(() => {
    const topology = usStatesTopology as unknown as {
      objects?: { states?: unknown };
    };
    if (!topology.objects?.states) return null;

    return feature(topology as never, topology.objects.states as never);
  }, []);

  const pathGenerator = useMemo(() => {
    if (!worldGeo) return null;
    const projection = geoEqualEarth().fitExtent([[10, 12], [990, 488]], worldGeo as never);
    return geoPath(projection);
  }, [worldGeo]);

  const tripLocations = useMemo(() => getTripLocationSummaries(trips), [trips]);

  const locationQueries = useMemo(() => {
    const unique = new Set(tripLocations.map((location) => location.query.trim()).filter(Boolean));
    return Array.from(unique);
  }, [tripLocations]);

  useEffect(() => {
    let cancelled = false;

    const resolveDestinations = async () => {
      if (!trips.length) {
        setPointsById({});
        return;
      }

      const cache = readGeoCache();
      const destinationCoords: Record<string, { lat: number; lng: number; source: TripPoint["source"] }> = {};
      const unresolved: string[] = [];

      locationQueries.forEach((destination) => {
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
      tripLocations.forEach((location) => {
        const resolved = destinationCoords[location.query];
        if (!resolved) return;
        firstPass[location.id] = {
          id: location.id,
          trip: location.trip,
          label: location.label,
          query: location.query,
          lat: resolved.lat,
          lng: resolved.lng,
          source: resolved.source,
        };
      });
      setPointsById(firstPass);

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
      tripLocations.forEach((location) => {
        const resolved = destinationCoords[location.query];
        if (!resolved) return;
        finalPass[location.id] = {
          id: location.id,
          trip: location.trip,
          label: location.label,
          query: location.query,
          lat: resolved.lat,
          lng: resolved.lng,
          source: resolved.source,
        };
      });
      setPointsById(finalPass);
      setLoading(false);
    };

    void resolveDestinations();

    return () => {
      cancelled = true;
    };
  }, [locationQueries, tripLocations, trips]);

  const points = useMemo(() => Object.values(pointsById), [pointsById]);
  const unresolvedCount = tripLocations.length - points.length;

  const portugalFeature = useMemo(() => {
    const sourceGeo = worldGeoHighRes ?? worldGeo;

    if (!sourceGeo || !("features" in sourceGeo) || !Array.isArray(sourceGeo.features)) {
      return null;
    }

    const byId = sourceGeo.features.find((geo) => String((geo as { id?: string | number }).id ?? "") === "620");
    if (byId) return byId;

    return sourceGeo.features.find((geo) => geoContains(geo as never, [-9.1393, 38.7223])) ?? null;
  }, [worldGeo, worldGeoHighRes]);

  const portugalMainlandFeature = useMemo(() => {
    if (!portugalFeature) return null;

    const geometry = (portugalFeature as { geometry?: { type?: string; coordinates?: unknown } }).geometry;
    if (!geometry || geometry.type !== "MultiPolygon" || !Array.isArray(geometry.coordinates)) {
      return portugalFeature;
    }

    const largestPolygon = geometry.coordinates
      .filter((polygon) => Array.isArray(polygon))
      .reduce<{ polygon: unknown[] | null; area: number }>((best, polygon) => {
        const candidate = {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: polygon,
          },
          properties: {},
        } as const;

        const area = geoArea(candidate as never);
        if (area > best.area) {
          return { polygon, area };
        }
        return best;
      }, { polygon: null, area: -1 });

    if (!largestPolygon.polygon) {
      return portugalFeature;
    }

    return {
      ...portugalFeature,
      geometry: {
        type: "Polygon",
        coordinates: largestPolygon.polygon,
      },
    };
  }, [portugalFeature]);

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

  const usStateFeatures = useMemo(() => {
    if (!usStatesGeo || !("features" in usStatesGeo) || !Array.isArray(usStatesGeo.features)) {
      return [] as Array<{ d: string; id: string }>;
    }

    if (!pathGenerator) return [] as Array<{ d: string; id: string }>;

    return usStatesGeo.features
      .map((geo, index) => ({
        d: pathGenerator(geo as never) ?? "",
        id: String((geo as { id?: string | number }).id ?? index),
      }))
      .filter((item) => item.d);
  }, [pathGenerator, usStatesGeo]);

  const visitedCountryIds = useMemo(() => {
    if (!worldGeo || !("features" in worldGeo) || !Array.isArray(worldGeo.features)) {
      return new Set<string>();
    }

    const ids = new Set<string>();

    worldGeo.features.forEach((geo, index) => {
      const id = String((geo as { id?: string | number }).id ?? index);
      const visited = points.some((point) => geoContains(geo as never, [point.lng, point.lat]));
      if (visited) {
        ids.add(id);
      }
    });

    return ids;
  }, [points, worldGeo]);

  const visitedUsStateIds = useMemo(() => {
    if (!usStatesGeo || !("features" in usStatesGeo) || !Array.isArray(usStatesGeo.features)) {
      return new Set<string>();
    }

    const ids = new Set<string>();

    usStatesGeo.features.forEach((geo, index) => {
      const id = String((geo as { id?: string | number }).id ?? index);
      const visited = points.some((point) => geoContains(geo as never, [point.lng, point.lat]));
      if (visited) {
        ids.add(id);
      }
    });

    return ids;
  }, [points, usStatesGeo]);

  const portugalPathGenerator = useMemo(() => {
    if (!portugalMainlandFeature) return null;
    const projection = geoMercator().fitExtent([[30, 14], [330, 246]], portugalMainlandFeature as never);
    return geoPath(projection);
  }, [portugalMainlandFeature]);

  const portugalPath = useMemo(() => {
    if (!portugalMainlandFeature || !portugalPathGenerator) return "";
    return portugalPathGenerator(portugalMainlandFeature as never) ?? "";
  }, [portugalMainlandFeature, portugalPathGenerator]);

  const portugalPoints = useMemo(() => {
    const isPortugalPoint = (point: TripPoint) => {
      if (!isPortugalTripDestination(point.trip)) return false;

      const matchesQuery = matchesPortugalLocation(point.query) || matchesPortugalLocation(point.label);
      const inMainlandBounds = point.lat >= 36.8 && point.lat <= 42.3 && point.lng >= -9.7 && point.lng <= -6.0;
      const insideMainland = portugalMainlandFeature
        ? geoContains(portugalMainlandFeature as never, [point.lng, point.lat])
        : false;

      return insideMainland || (matchesQuery && inMainlandBounds);
    };

    return points.filter(isPortugalPoint);
  }, [points, portugalMainlandFeature]);

  const portugalWorldExcludedPointIds = useMemo(() => {
    const isPortugalLocatedPoint = (point: TripPoint) => {
      const matchesQuery = matchesPortugalLocation(point.query) || matchesPortugalLocation(point.label);
      const inMainlandBounds = point.lat >= 36.8 && point.lat <= 42.3 && point.lng >= -9.7 && point.lng <= -6.0;
      const insideMainland = portugalMainlandFeature
        ? geoContains(portugalMainlandFeature as never, [point.lng, point.lat])
        : false;

      return insideMainland || (matchesQuery && inMainlandBounds);
    };

    return new Set(points.filter(isPortugalLocatedPoint).map((point) => point.id));
  }, [points, portugalMainlandFeature]);

  const worldPinsPoints = useMemo(() => {
    return points.filter((point) => !portugalWorldExcludedPointIds.has(point.id));
  }, [points, portugalWorldExcludedPointIds]);

  const projectedPoints = useMemo(() => {
    if (!pathGenerator?.projection()) return [] as Array<{ point: TripPoint; x: number; y: number }>;

    const projection = pathGenerator.projection();
    return worldPinsPoints
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
  }, [pathGenerator, worldPinsPoints]);

  const projectedPortugalPoints = useMemo(() => {
    if (!portugalPathGenerator?.projection()) return [] as Array<{ point: TripPoint; x: number; y: number }>;

    const projection = portugalPathGenerator.projection();
    return portugalPoints
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
  }, [portugalPathGenerator, portugalPoints]);

  const hoveredWorldPoint = useMemo(
    () => (hoveredMap === "world"
      ? projectedPoints.find(({ point }) => point.id === hoveredPointId) ?? null
      : null),
    [hoveredMap, hoveredPointId, projectedPoints],
  );

  const hoveredPortugalPoint = useMemo(
    () => (hoveredMap === "portugal"
      ? projectedPortugalPoints.find(({ point }) => point.id === hoveredPointId) ?? null
      : null),
    [hoveredMap, hoveredPointId, projectedPortugalPoints],
  );

  const hoveredWorldLabel = hoveredWorldPoint ? localizeTripLocationLabel(hoveredWorldPoint.point.label, language) : "";
  const hoveredPortugalLabel = hoveredPortugalPoint ? localizeTripLocationLabel(hoveredPortugalPoint.point.label, language) : "";
  const hoveredLabelWidth = hoveredWorldLabel ? measureHoverLabelWidth(hoveredWorldLabel) : 0;
  const hoveredPortugalLabelWidth = hoveredPortugalLabel ? measureHoverLabelWidth(hoveredPortugalLabel) : 0;

  const getPanBounds = (currentZoom: number) => ({
    x: Math.max(0, ((1000 * currentZoom) - 1000) / 2),
    y: Math.max(0, ((500 * currentZoom) - 500) / 2),
  });

  const clampPan = (nextPan: { x: number; y: number }, nextZoom: number) => {
    const bounds = getPanBounds(nextZoom);
    return {
      x: Math.max(-bounds.x, Math.min(bounds.x, nextPan.x)),
      y: Math.max(-bounds.y, Math.min(bounds.y, nextPan.y)),
    };
  };

  const zoomTransform = `translate(${pan.x} ${pan.y}) translate(${500 - 500 * zoom} ${250 - 250 * zoom}) scale(${zoom})`;
  const pinScale = Number((0.9 / Math.pow(zoom, 1.2)).toFixed(4));

  const applyZoomDelta = (delta: number) => {
    setZoom((current) => {
      const nextZoom = Math.min(3, Math.max(1, Number((current + delta).toFixed(2))));
      setPan((currentPan) => clampPan(currentPan, nextZoom));
      return nextZoom;
    });
  };

  const handleWheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      applyZoomDelta(event.deltaY < 0 ? 0.18 : -0.18);
      return;
    }

    if (zoom <= 1) return;

    setPan((current) => clampPan({
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }, zoom));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const endDrag = () => {
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (zoom <= 1 || event.button !== 0) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };
    suppressClickRef.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const moved = Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;

    if (moved) {
      dragState.moved = true;
      suppressClickRef.current = true;
    }

    setPan(clampPan({
      x: dragState.originX + deltaX,
      y: dragState.originY + deltaY,
    }, zoom));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    endDrag();

    if (dragState.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    suppressClickRef.current = false;
    endDrag();
  };

  useEffect(() => {
    if (zoom === 1 && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  const mapInteractionHint = zoom > 1
    ? t("trips.map.interactionHintZoom")
    : t("trips.map.interactionHintDefault");

  const isDarkTheme = typeof document !== "undefined"
    && document.documentElement.classList.contains("dark");
  const visitedCountryFill = isDarkTheme
    ? "rgba(239, 68, 68, 0.28)"
    : "rgba(239, 68, 68, 0.16)";
  const visitedCountryStroke = isDarkTheme
    ? "rgba(248, 113, 113, 0.96)"
    : "rgba(220, 38, 38, 0.88)";

  const handleWheelCapture = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || zoom > 1) {
      handleWheelZoom(event);
    }
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-secondary/40 to-background p-4 sm:p-5 lg:p-6 shadow-sm">
      <div className="mb-4 sm:mb-5 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-body uppercase tracking-[0.14em] text-muted-foreground">{t("trips.map.title")}</p>
          <h3 className="font-display text-xl sm:text-2xl text-foreground">{t("trips.map.subtitle")}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 p-1 text-muted-foreground">
            <button
              type="button"
              onClick={() => applyZoomDelta(-0.2)}
              disabled={zoom <= 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("trips.map.zoomOut")}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={resetView}
              disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
              className="rounded-full px-2 py-1 text-[11px] font-body hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => applyZoomDelta(0.2)}
              disabled={zoom >= 3}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t("trips.map.zoomIn")}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-body text-muted-foreground bg-background/70">
            <MapPin className="h-3.5 w-3.5" />
            <span>{projectedPoints.length} {t("common.pins")}</span>
          </div>
        </div>
      </div>

      <div onWheel={handleWheelCapture} className="rounded-2xl border border-border/50 bg-background/70 p-2 sm:p-3 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 1000 500"
          className="h-auto w-full touch-none select-none"
          style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          role="img"
          aria-label={t("trips.map.worldMapAria")}
        >
          <rect x="0" y="0" width="1000" height="500" fill="hsl(var(--background))" />
          <g transform={zoomTransform} style={{ transition: "transform 180ms ease" }}>
            {mapFeatures.map((country) => (
              <path
                key={country.id}
                d={country.d}
                fill={visitedCountryIds.has(country.id) && country.id !== USA_COUNTRY_ID ? visitedCountryFill : "hsl(var(--secondary))"}
                stroke={visitedCountryIds.has(country.id) && country.id !== USA_COUNTRY_ID ? visitedCountryStroke : "hsl(var(--border))"}
                strokeWidth={visitedCountryIds.has(country.id) && country.id !== USA_COUNTRY_ID ? "1" : "0.5"}
              />
            ))}

            {usStateFeatures.map((state) => {
              if (!visitedUsStateIds.has(state.id)) return null;

              return (
                <path
                  key={`us-state-${state.id}`}
                  d={state.d}
                  fill={visitedCountryFill}
                  stroke={visitedCountryStroke}
                  strokeWidth="0.9"
                />
              );
            })}

            {projectedPoints.map(({ point, x, y }) => (
              <g
                key={point.id}
                transform={`translate(${x}, ${y}) scale(${pinScale})`}
                onClick={() => {
                  if (suppressClickRef.current) return;
                  onSelectTrip?.(point.trip);
                }}
                onMouseEnter={() => {
                  setHoveredMap("world");
                  setHoveredPointId(point.id);
                }}
                onMouseLeave={() => {
                  setHoveredPointId((prev) => (prev === point.id ? null : prev));
                  setHoveredMap((prev) => (prev === "world" ? null : prev));
                }}
                style={{
                  cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : (onSelectTrip ? "pointer" : "default"),
                  transition: "transform 160ms ease",
                }}
              >
                <title>{localizeTripLocationLabel(point.label, language)}</title>
                <circle
                  r={hoveredPointId === point.id ? "15" : "12"}
                  fill="hsl(var(--accent) / 0.22)"
                  style={{ transition: "r 160ms ease" }}
                />
                <circle
                  r={hoveredPointId === point.id ? "9.6" : "8"}
                  fill="#ef4444"
                  stroke="hsl(var(--background))"
                  strokeWidth={hoveredPointId === point.id ? "3.2" : "2.8"}
                  style={{ transition: "r 160ms ease, stroke-width 160ms ease" }}
                />
                <circle
                  r={hoveredPointId === point.id ? "3.4" : "2.9"}
                  fill="hsl(var(--background))"
                  style={{ transition: "r 160ms ease" }}
                />
              </g>
            ))}

            {hoveredWorldPoint && (
              <g
                transform={`translate(${hoveredWorldPoint.x + 12}, ${hoveredWorldPoint.y - 30}) scale(${pinScale})`}
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
                  {hoveredWorldLabel}
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>

      <p className="mt-2 text-[11px] font-body text-muted-foreground">{mapInteractionHint}</p>

      {portugalPath && projectedPortugalPoints.length > 0 && (
        <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-border/50 bg-background/70 p-2 sm:p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-body uppercase tracking-[0.12em] text-muted-foreground">{t("common.portugal")}</p>
            <p className="text-xs font-body text-muted-foreground">{projectedPortugalPoints.length} {t("common.pins")}</p>
          </div>
          <svg viewBox="0 0 360 260" className="h-64 w-full" role="img" aria-label={t("trips.map.portugalMapAria")}>
            <rect x="0" y="0" width="360" height="260" fill="hsl(var(--background))" />
            <path
              d={portugalPath}
              fill="hsl(var(--secondary))"
              stroke={visitedCountryStroke}
              strokeWidth="1"
            />

            {projectedPortugalPoints.map(({ point, x, y }) => (
              <g
                key={`pt-${point.id}`}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectTrip?.(point.trip)}
                onMouseEnter={() => {
                  setHoveredMap("portugal");
                  setHoveredPointId(point.id);
                }}
                onMouseLeave={() => {
                  setHoveredPointId((prev) => (prev === point.id ? null : prev));
                  setHoveredMap((prev) => (prev === "portugal" ? null : prev));
                }}
                style={{ cursor: onSelectTrip ? "pointer" : "default" }}
              >
                <title>{localizeTripLocationLabel(point.label, language)}</title>
                <circle r={hoveredPointId === point.id ? "11" : "9"} fill="hsl(var(--accent) / 0.2)" />
                <circle r={hoveredPointId === point.id ? "6.6" : "5.6"} fill="#ef4444" stroke="hsl(var(--background))" strokeWidth="2.2" />
                <circle r={hoveredPointId === point.id ? "2.3" : "2"} fill="hsl(var(--background))" />
              </g>
            ))}

            {hoveredPortugalPoint && (
              <g transform={`translate(${hoveredPortugalPoint.x + 10}, ${hoveredPortugalPoint.y - 26})`} style={{ pointerEvents: "none" }}>
                <rect
                  x="0"
                  y="0"
                  rx="8"
                  ry="8"
                  width={hoveredPortugalLabelWidth}
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
                  {hoveredPortugalLabel}
                </text>
              </g>
            )}
          </svg>
        </div>
      )}

      {(loading || unresolvedCount > 0) && (
        <p className="mt-3 text-xs font-body text-muted-foreground">
          {loading
            ? t("trips.map.locating")
            : `${unresolvedCount} ${t(unresolvedCount === 1 ? "trips.map.unresolvedOne" : "trips.map.unresolvedMany")}`}
        </p>
      )}
    </div>
  );
}
