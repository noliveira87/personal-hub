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

type TripGeoScope = {
  hasPortugal: boolean;
  hasNonPortugal: boolean;
};

type CachedGeo = {
  lat: number;
  lng: number;
};

const GEO_CACHE_KEY = "trip-destination-geocode-cache-v2";
const USA_COUNTRY_ID = "840";

const PORTUGAL_QUERY_REGEX = /\bportugal\b/i;

const DESTINATION_FALLBACKS: Array<{ regex: RegExp; lat: number; lng: number }> = [
  { regex: /madison|wisconsin/i, lat: 43.0731, lng: -89.4012 },
  { regex: /malta|valletta|sliema/i, lat: 35.8989, lng: 14.5146 },
  // Portugal cities — cover common destinations so geocoding is never needed
  { regex: /lisboa|lisbon/i, lat: 38.7223, lng: -9.1393 },
  { regex: /\bporto\b/i, lat: 41.1579, lng: -8.6291 },
  { regex: /e?vora|évora/i, lat: 38.5714, lng: -7.9135 },
  { regex: /vilamoura/i, lat: 37.0717, lng: -8.1220 },
  { regex: /portim.o|portimao/i, lat: 37.1360, lng: -8.5376 },
  { regex: /\bfaro\b/i, lat: 37.0194, lng: -7.9322 },
  { regex: /lagos/i, lat: 37.1020, lng: -8.6730 },
  { regex: /cascais/i, lat: 38.6979, lng: -9.4215 },
  { regex: /sintra/i, lat: 38.7979, lng: -9.3900 },
  { regex: /setubal|setúbal/i, lat: 38.5244, lng: -8.8882 },
  { regex: /braga/i, lat: 41.5503, lng: -8.4200 },
  { regex: /coimbra/i, lat: 40.2033, lng: -8.4103 },
  { regex: /aveiro/i, lat: 40.6405, lng: -8.6538 },
  { regex: /beja/i, lat: 38.0153, lng: -7.8645 },
  { regex: /matosinhos/i, lat: 41.1834, lng: -8.6867 },
  { regex: /portalegre/i, lat: 39.2967, lng: -7.4286 },
  { regex: /viseu/i, lat: 40.6566, lng: -7.9122 },
  { regex: /guimaraes|guimarães/i, lat: 41.4425, lng: -8.2918 },
  { regex: /viana do castelo/i, lat: 41.6918, lng: -8.8340 },
  { regex: /leiria/i, lat: 39.7444, lng: -8.8072 },
  { regex: /santarem|santarém/i, lat: 39.2369, lng: -8.6849 },
  { regex: /albufeira/i, lat: 37.0892, lng: -8.2506 },
  { regex: /tavira/i, lat: 37.1284, lng: -7.6511 },
  { regex: /sagres/i, lat: 37.0124, lng: -8.9395 },
  { regex: /nazare|nazaré/i, lat: 39.6011, lng: -9.0705 },
  { regex: /obidos|óbidos/i, lat: 39.3631, lng: -9.1576 },
  { regex: /tomar/i, lat: 39.6031, lng: -8.4140 },
  { regex: /alcobaça/i, lat: 39.5504, lng: -8.9786 },
  { regex: /funchal|madeira/i, lat: 32.6669, lng: -16.9241 },
  { regex: /ponta delgada|a.ores|açores|azores/i, lat: 37.7412, lng: -25.6756 },
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
    return Math.max(80, label.length * 6);
  }

  if (labelMeasureContext === undefined) {
    const canvas = document.createElement("canvas");
    labelMeasureContext = canvas.getContext("2d");
  }

  if (!labelMeasureContext) {
    return Math.max(80, label.length * 6);
  }

  labelMeasureContext.font = "10px system-ui, sans-serif";
  return Math.ceil(labelMeasureContext.measureText(label).width + 18);
};

const geocodeDestination = async (destination: string): Promise<CachedGeo | null> => {
  const normalized = normalizeLocationText(destination);
  const queries = [destination];

  // If plain city lookup fails, try a Portugal-biased retry for ambiguous city names.
  if (!destination.includes(",") && !PORTUGAL_QUERY_REGEX.test(normalized)) {
    queries.push(`${destination}, Portugal`);
  }

  for (const query of queries) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) continue;

      const payload = await response.json() as Array<{ lat?: string; lon?: string }>;
      const first = payload[0];
      if (!first?.lat || !first?.lon) continue;

      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      return { lat, lng };
    } catch {
      // Try the next query candidate.
    }
  }

  return null;
};

export function TripsWorldMap({ trips, onSelectTrip }: TripsWorldMapProps) {
  const { t, language } = useI18n();
  const [pointsById, setPointsById] = useState<Record<string, TripPoint>>({});
  const [loading, setLoading] = useState(false);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [hoveredMap, setHoveredMap] = useState<"world" | "portugal" | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [portugaltZoom, setPortugalZoom] = useState(1);
  const [portugalPan, setPortugalPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPortugalDragging, setIsPortugalDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const portugalSvgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const portugalDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const suppressPortugalClickRef = useRef(false);

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
        const fallback = findFallback(destination);
        if (fallback) {
          destinationCoords[destination] = { ...fallback, source: "fallback" };
          cache[destination] = fallback;
          return;
        }

        if (cache[destination]) {
          destinationCoords[destination] = { ...cache[destination], source: "cache" };
          return;
        }

        unresolved.push(destination);
      });

      writeGeoCache(cache);

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

  const portugalPathGenerator = useMemo(() => {
    if (!portugalFeature) return null;
    const projection = geoMercator().fitExtent([[1, 0], [359, 260]], portugalFeature as never);
    return geoPath(projection);
  }, [portugalFeature]);

  const portugalPath = useMemo(() => {
    if (!portugalFeature || !portugalPathGenerator) return "";
    return portugalPathGenerator(portugalFeature as never) ?? "";
  }, [portugalFeature, portugalPathGenerator]);

  const isPointLocatedInPortugal = useMemo(() => {
    return (point: Pick<TripPoint, "lat" | "lng">) => {
      if (!portugalFeature) return false;
      return geoContains(portugalFeature as never, [point.lng, point.lat]);
    };
  }, [portugalFeature]);

  const tripGeoScopeById = useMemo(() => {
    const scope = new Map<string, TripGeoScope>();

    points.forEach((point) => {
      const inPortugal = isPointLocatedInPortugal(point);
      const current = scope.get(point.trip.id) ?? { hasPortugal: false, hasNonPortugal: false };

      if (inPortugal) {
        current.hasPortugal = true;
      } else {
        current.hasNonPortugal = true;
      }

      scope.set(point.trip.id, current);
    });

    return scope;
  }, [points, isPointLocatedInPortugal]);

  const visiblePoints = useMemo(() => {
    return points.filter((point) => {
      const inPortugal = isPointLocatedInPortugal(point);
      if (!inPortugal) return true;

      const scope = tripGeoScopeById.get(point.trip.id);
      if (!scope) return true;

      // Hide Portugal stopover points when the same trip also has non-Portugal points.
      return !scope.hasNonPortugal;
    });
  }, [points, tripGeoScopeById]);

  const portugalPoints = useMemo(() => {
    return visiblePoints.filter((point) => isPointLocatedInPortugal(point));
  }, [visiblePoints]);

  const worldPinsPoints = useMemo(() => {
    return visiblePoints.filter((point) => !isPointLocatedInPortugal(point));
  }, [visiblePoints]);

  const visitedCountryIds = useMemo(() => {
    if (!worldGeo || !("features" in worldGeo) || !Array.isArray(worldGeo.features)) {
      return new Set<string>();
    }

    const ids = new Set<string>();

    worldGeo.features.forEach((geo, index) => {
      const id = String((geo as { id?: string | number }).id ?? index);
      const visited = worldPinsPoints.some((point) => geoContains(geo as never, [point.lng, point.lat]));
      if (visited) {
        ids.add(id);
      }
    });

    return ids;
  }, [worldGeo, worldPinsPoints]);

  const visitedUsStateIds = useMemo(() => {
    if (!usStatesGeo || !("features" in usStatesGeo) || !Array.isArray(usStatesGeo.features)) {
      return new Set<string>();
    }

    const ids = new Set<string>();

    usStatesGeo.features.forEach((geo, index) => {
      const id = String((geo as { id?: string | number }).id ?? index);
      const visited = worldPinsPoints.some((point) => geoContains(geo as never, [point.lng, point.lat]));
      if (visited) {
        ids.add(id);
      }
    });

    return ids;
  }, [usStatesGeo, worldPinsPoints]);

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

  const getPanBoundsPT = (currentZoom: number) => ({
    x: Math.max(0, ((360 * currentZoom) - 360) / 2),
    y: Math.max(0, ((260 * currentZoom) - 260) / 2),
  });

  const clampPanPT = (nextPan: { x: number; y: number }, nextZoom: number) => {
    const bounds = getPanBoundsPT(nextZoom);
    return {
      x: Math.max(-bounds.x, Math.min(bounds.x, nextPan.x)),
      y: Math.max(-bounds.y, Math.min(bounds.y, nextPan.y)),
    };
  };

  const zoomTransform = `translate(${pan.x} ${pan.y}) translate(${500 - 500 * zoom} ${250 - 250 * zoom}) scale(${zoom})`;
  const pinScale = Number((0.9 / Math.pow(zoom, 1.2)).toFixed(4));

  const zoomTransformPT = `translate(${portugalPan.x} ${portugalPan.y}) translate(${180 - 180 * portugaltZoom} ${130 - 130 * portugaltZoom}) scale(${portugaltZoom})`;
  const pinScalePT = Number((0.9 / Math.pow(portugaltZoom, 1.2)).toFixed(4));

  const applyZoomDelta = (delta: number) => {
    setZoom((current) => {
      const nextZoom = Math.min(3, Math.max(1, Number((current + delta).toFixed(2))));
      setPan((currentPan) => clampPan(currentPan, nextZoom));
      return nextZoom;
    });
  };

  const applyZoomDeltaPT = (delta: number) => {
    setPortugalZoom((current) => {
      const nextZoom = Math.min(3, Math.max(1, Number((current + delta).toFixed(2))));
      setPortugalPan((currentPan) => clampPanPT(currentPan, nextZoom));
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

  const handleWheelZoomPT = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      applyZoomDeltaPT(event.deltaY < 0 ? 0.18 : -0.18);
      return;
    }

    if (portugaltZoom <= 1) return;

    setPortugalPan((current) => clampPanPT({
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }, portugaltZoom));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const resetViewPT = () => {
    setPortugalZoom(1);
    setPortugalPan({ x: 0, y: 0 });
  };

  const endDrag = () => {
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const endDragPT = () => {
    portugalDragStateRef.current = null;
    setIsPortugalDragging(false);
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

  const handlePointerDownPT = (event: React.PointerEvent<SVGSVGElement>) => {
    if (portugaltZoom <= 1 || event.button !== 0) return;

    portugalDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: portugalPan.x,
      originY: portugalPan.y,
      moved: false,
    };
    suppressPortugalClickRef.current = false;
    setIsPortugalDragging(true);
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

  const handlePointerMovePT = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = portugalDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const moved = Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;

    if (moved) {
      dragState.moved = true;
      suppressPortugalClickRef.current = true;
    }

    setPortugalPan(clampPanPT({
      x: dragState.originX + deltaX,
      y: dragState.originY + deltaY,
    }, portugaltZoom));
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

  const handlePointerUpPT = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = portugalDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    endDragPT();

    if (dragState.moved) {
      window.setTimeout(() => {
        suppressPortugalClickRef.current = false;
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

  const handlePointerCancelPT = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = portugalDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    suppressPortugalClickRef.current = false;
    endDragPT();
  };

  useEffect(() => {
    if (zoom === 1 && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    if (portugaltZoom === 1 && (portugalPan.x !== 0 || portugalPan.y !== 0)) {
      setPortugalPan({ x: 0, y: 0 });
    }
  }, [portugalPan.x, portugalPan.y, portugaltZoom]);

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

  const handleWheelCapturePT = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || portugaltZoom > 1) {
      handleWheelZoomPT(event);
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
                onPointerDown={(e) => e.stopPropagation()}
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
                style={{ pointerEvents: "none" }}
              >
                {(() => {
                  const labelWidth = hoveredLabelWidth;
                  const labelPadding = 4;
                  const labelFontSize = 10;
                  const labelHeight = labelPadding + labelFontSize + labelPadding;
                  let x = hoveredWorldPoint.x + 12;
                  let y = hoveredWorldPoint.y - 30;
                  
                  // Constrain to SVG bounds (viewBox: 0 0 1000 500)
                  if (x + labelWidth > 1000) x = hoveredWorldPoint.x - labelWidth - 5;
                  if (x < 0) x = 5;
                  if (y < 0) y = hoveredWorldPoint.y + 15;
                  if (y + labelHeight > 500) y = hoveredWorldPoint.y - labelHeight - 5;
                  
                  return (
                    <g transform={`translate(${x}, ${y}) scale(${pinScale})`}>
                      <rect
                        x="0"
                        y="0"
                        rx="8"
                        ry="8"
                        width={labelWidth}
                        height={labelHeight}
                        fill="hsl(var(--foreground))"
                        opacity="0.95"
                      />
                          <text
                            x="9"
                            y={labelPadding + labelFontSize}
                            fill="hsl(var(--background))"
                            fontSize={labelFontSize}
                            fontFamily="system-ui, sans-serif"
                          >
                            {hoveredWorldLabel}
                          </text>
                    </g>
                  );
                })()}
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
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 p-1 text-muted-foreground">
                <button
                  type="button"
                  onClick={() => applyZoomDeltaPT(-0.2)}
                  disabled={portugaltZoom <= 1}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("trips.map.zoomOut")}
                >
                  <ZoomOut className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={resetViewPT}
                  disabled={portugaltZoom === 1 && portugalPan.x === 0 && portugalPan.y === 0}
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-body hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {Math.round(portugaltZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => applyZoomDeltaPT(0.2)}
                  disabled={portugaltZoom >= 3}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("trips.map.zoomIn")}
                >
                  <ZoomIn className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs font-body text-muted-foreground">{projectedPortugalPoints.length} {t("common.pins")}</p>
            </div>
          </div>
          <div onWheel={handleWheelCapturePT} className="rounded-2xl border border-border/50 bg-background/70 p-2 overflow-hidden">
            <svg
              ref={portugalSvgRef}
              viewBox="0 0 360 260"
              className="h-96 w-full touch-none select-none"
              style={{ cursor: portugaltZoom > 1 ? (isPortugalDragging ? "grabbing" : "grab") : "default" }}
              onPointerDown={handlePointerDownPT}
              onPointerMove={handlePointerMovePT}
              onPointerUp={handlePointerUpPT}
              onPointerCancel={handlePointerCancelPT}
              role="img"
              aria-label={t("trips.map.portugalMapAria")}
            >
              <rect x="0" y="0" width="360" height="260" fill="hsl(var(--background))" />
              <g transform={zoomTransformPT} style={{ transition: "transform 180ms ease" }}>
                <path
                  d={portugalPath}
                  fill="hsl(var(--secondary))"
                  stroke={visitedCountryStroke}
                  strokeWidth="1"
                />

                {projectedPortugalPoints.map(({ point, x, y }) => (
                  <g
                    key={`pt-${point.id}`}
                    transform={`translate(${x}, ${y}) scale(${pinScalePT})`}
                    onClick={() => {
                      if (suppressPortugalClickRef.current) return;
                      onSelectTrip?.(point.trip);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseEnter={() => {
                      setHoveredMap("portugal");
                      setHoveredPointId(point.id);
                    }}
                    onMouseLeave={() => {
                      setHoveredPointId((prev) => (prev === point.id ? null : prev));
                      setHoveredMap((prev) => (prev === "portugal" ? null : prev));
                    }}
                    style={{ 
                      cursor: portugaltZoom > 1 ? (isPortugalDragging ? "grabbing" : "grab") : (onSelectTrip ? "pointer" : "default"),
                      transition: "transform 160ms ease",
                    }}
                  >
                    <title>{localizeTripLocationLabel(point.label, language)}</title>
                    <circle r={hoveredPointId === point.id ? "11" : "8"} fill="hsl(var(--accent) / 0.2)" style={{ transition: "r 160ms ease" }} />
                    <circle r={hoveredPointId === point.id ? "6.6" : "5.6"} fill="#ef4444" stroke="hsl(var(--background))" strokeWidth="2.2" style={{ transition: "r 160ms ease, stroke-width 160ms ease" }} />
                    <circle r={hoveredPointId === point.id ? "2.3" : "2"} fill="hsl(var(--background))" style={{ transition: "r 160ms ease" }} />
                  </g>
                ))}

                {hoveredPortugalPoint && (
                  <g
                    style={{ pointerEvents: "none" }}
                  >
                    {(() => {
                      const labelWidth = hoveredPortugalLabelWidth;
                      const labelPadding = 4;
                      const labelFontSize = 10;
                      const labelHeight = labelPadding + labelFontSize + labelPadding;
                      let x = hoveredPortugalPoint.x + 10;
                      let y = hoveredPortugalPoint.y - 26;
                      
                      // Constrain to SVG bounds (viewBox: 0 0 360 260)
                      if (x + labelWidth > 360) x = hoveredPortugalPoint.x - labelWidth - 5;
                      if (x < 0) x = 5;
                      if (y < 0) y = hoveredPortugalPoint.y + 15;
                      if (y + labelHeight > 260) y = hoveredPortugalPoint.y - labelHeight - 5;
                      
                      return (
                        <g transform={`translate(${x}, ${y}) scale(${pinScalePT})`}>
                          <rect
                            x="0"
                            y="0"
                            rx="8"
                            ry="8"
                            width={labelWidth}
                            height={labelHeight}
                            fill="hsl(var(--foreground))"
                            opacity="0.95"
                          />\n                          <text
                            x="9"
                            y={labelPadding + labelFontSize}
                            fill="hsl(var(--background))"
                            fontSize={labelFontSize}
                            fontFamily="system-ui, sans-serif"
                          >
                            {hoveredPortugalLabel}
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                )}
              </g>
            </svg>
          </div>
          <p className="mt-1.5 text-[10px] font-body text-muted-foreground">
            {portugaltZoom > 1 ? t("trips.map.interactionHintZoom") : t("trips.map.interactionHintDefault")}
          </p>
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
