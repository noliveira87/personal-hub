import { Investment } from "@/features/portfolio/types/investment";

const BTC_UNITS_PREFIX = "BTC_UNITS:";
const CRYPTO_TABLE_PREFIX = "CRYPTO_TABLE_V1:";

export interface CryptoNoteMeta {
  btcUnits: number | null;
  userNotes: string;
}

export interface CryptoPosition {
  symbol: string;
  marketPriceEur: number;
  investedUnits: number;
  cashbackUnits: number;
}

export interface CryptoTableMeta {
  positions: CryptoPosition[];
  userNotes: string;
}

export interface BtcQuote {
  eur: number;
  lastUpdatedAt: string;
}

function normalizeSymbol(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().slice(0, 10);
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizePosition(raw: unknown): CryptoPosition | null {
  if (!raw || typeof raw !== "object") return null;

  const input = raw as {
    symbol?: unknown;
    marketPriceEur?: unknown;
    investedUnits?: unknown;
    cashbackUnits?: unknown;
  };

  const symbol = normalizeSymbol(input.symbol);
  const marketPriceEur = normalizeNumber(input.marketPriceEur);
  const investedUnits = normalizeNumber(input.investedUnits);
  const cashbackUnits = normalizeNumber(input.cashbackUnits);

  if (!symbol || marketPriceEur <= 0) {
    return null;
  }

  return {
    symbol,
    marketPriceEur,
    investedUnits,
    cashbackUnits,
  };
}

export function computeCryptoPositionValues(position: CryptoPosition): {
  investedEur: number;
  cashbackEur: number;
  totalEur: number;
} {
  const investedEur = position.investedUnits * position.marketPriceEur;
  const cashbackEur = position.cashbackUnits * position.marketPriceEur;
  const totalEur = investedEur + cashbackEur;

  return { investedEur, cashbackEur, totalEur };
}

export function getCryptoTableTotalEur(positions: CryptoPosition[]): number {
  return positions.reduce((sum, position) => sum + computeCryptoPositionValues(position).totalEur, 0);
}

export function parseCryptoTableNotes(notes?: string): CryptoTableMeta {
  if (!notes) {
    return { positions: [], userNotes: "" };
  }

  const trimmed = notes.trim();
  if (!trimmed.startsWith(CRYPTO_TABLE_PREFIX)) {
    return { positions: [], userNotes: notes };
  }

  const firstLineEnd = trimmed.indexOf("\n");
  const header = firstLineEnd === -1 ? trimmed : trimmed.slice(0, firstLineEnd);
  const payloadRaw = header.slice(CRYPTO_TABLE_PREFIX.length).trim();

  try {
    const decoded = decodeURIComponent(payloadRaw);
    const parsed = JSON.parse(decoded) as { positions?: unknown[] };
    const positions = Array.isArray(parsed.positions)
      ? parsed.positions.map(normalizePosition).filter((value): value is CryptoPosition => Boolean(value))
      : [];

    const userNotes = firstLineEnd === -1 ? "" : trimmed.slice(firstLineEnd + 1).trim();

    return {
      positions,
      userNotes,
    };
  } catch {
    return { positions: [], userNotes: notes };
  }
}

export function serializeCryptoTableNotes(positions: CryptoPosition[], userNotes?: string): string | undefined {
  const cleanNotes = (userNotes ?? "").trim();
  const normalizedPositions = positions
    .map(normalizePosition)
    .filter((value): value is CryptoPosition => Boolean(value));

  if (!normalizedPositions.length) {
    return cleanNotes || undefined;
  }

  const payload = encodeURIComponent(JSON.stringify({ positions: normalizedPositions }));
  const header = `${CRYPTO_TABLE_PREFIX}${payload}`;
  return cleanNotes ? `${header}\n${cleanNotes}` : header;
}

export function parseCryptoNotes(notes?: string): CryptoNoteMeta {
  const tableMeta = parseCryptoTableNotes(notes);
  if (tableMeta.positions.length > 0) {
    const btcPosition = tableMeta.positions.find((position) => position.symbol === "BTC");
    const btcUnits = btcPosition ? btcPosition.investedUnits + btcPosition.cashbackUnits : null;
    return {
      btcUnits: btcUnits && btcUnits > 0 ? btcUnits : null,
      userNotes: tableMeta.userNotes,
    };
  }

  if (!notes) {
    return { btcUnits: null, userNotes: "" };
  }

  const trimmed = notes.trim();
  if (!trimmed.startsWith(BTC_UNITS_PREFIX)) {
    return { btcUnits: null, userNotes: notes };
  }

  const firstLineEnd = trimmed.indexOf("\n");
  const header = firstLineEnd === -1 ? trimmed : trimmed.slice(0, firstLineEnd);
  const valueRaw = header.slice(BTC_UNITS_PREFIX.length).trim();
  const parsed = Number(valueRaw);

  const userNotes = firstLineEnd === -1 ? "" : trimmed.slice(firstLineEnd + 1).trim();

  return {
    btcUnits: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    userNotes,
  };
}

export function serializeCryptoNotes(btcUnits: number | null, userNotes?: string): string | undefined {
  const cleanNotes = (userNotes ?? "").trim();

  if (!btcUnits || btcUnits <= 0) {
    return cleanNotes || undefined;
  }

  const header = `${BTC_UNITS_PREFIX}${btcUnits}`;
  return cleanNotes ? `${header}\n${cleanNotes}` : header;
}

export function resolveInvestmentCurrentValue(investment: Investment, btcSpotEur?: number | null): number {
  if (investment.type !== "crypto") {
    return investment.currentValue;
  }

  const { positions } = parseCryptoTableNotes(investment.notes);
  if (positions.length > 0) {
    return getCryptoTableTotalEur(positions);
  }

  const { btcUnits } = parseCryptoNotes(investment.notes);

  if (!btcUnits || !btcSpotEur || btcSpotEur <= 0) {
    return investment.currentValue;
  }

  return btcUnits * btcSpotEur;
}

export async function fetchBtcEurQuote(signal?: AbortSignal): Promise<BtcQuote> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur&include_last_updated_at=true",
    {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch BTC quote (${response.status})`);
  }

  const data = await response.json() as {
    bitcoin?: { eur?: number; last_updated_at?: number };
  };

  const eur = data.bitcoin?.eur;
  if (!eur || !Number.isFinite(eur)) {
    throw new Error("Invalid BTC quote payload");
  }

  const lastUpdatedAtUnix = data.bitcoin?.last_updated_at;
  const lastUpdatedAt =
    typeof lastUpdatedAtUnix === "number" && Number.isFinite(lastUpdatedAtUnix)
      ? new Date(lastUpdatedAtUnix * 1000).toISOString()
      : new Date().toISOString();

  return { eur, lastUpdatedAt };
}
