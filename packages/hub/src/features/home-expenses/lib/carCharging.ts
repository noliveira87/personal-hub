export type CarChargingLocation = 'home' | 'outside';

const CAR_CHARGING_PREFIX = '__car_charging_location__:';

export interface ParsedCarChargingNotes {
  location: CarChargingLocation | null;
  description: string;
}

export function encodeCarChargingNotes(location: CarChargingLocation, description?: string): string {
  const normalizedDescription = description?.trim() ?? '';
  return normalizedDescription
    ? `${CAR_CHARGING_PREFIX}${location}\n${normalizedDescription}`
    : `${CAR_CHARGING_PREFIX}${location}`;
}

export function parseCarChargingNotes(notes?: string | null): ParsedCarChargingNotes {
  const raw = notes?.trim() ?? '';
  if (!raw.startsWith(CAR_CHARGING_PREFIX)) {
    return {
      location: null,
      description: raw,
    };
  }

  const withoutPrefix = raw.slice(CAR_CHARGING_PREFIX.length);
  const [locationLine, ...descriptionLines] = withoutPrefix.split('\n');
  const location = locationLine === 'home' || locationLine === 'outside'
    ? locationLine
    : null;

  return {
    location,
    description: descriptionLines.join('\n').trim(),
  };
}