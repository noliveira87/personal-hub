import { Investment, InvestmentMovement, PortfolioEarning } from "@/features/portfolio/types/investment";

const LEGACY_BTC_UNITS_PREFIX = "BTC_UNITS:";
const CRYPTO_ASSET_PREFIX = "CRYPTO_ASSET:";
const CRYPTO_UNITS_PREFIX = "CRYPTO_UNITS:";
const CRYPTO_CASHBACK_ASSET_PREFIX = "CRYPTO_CASHBACK_ASSET:";
const CRYPTO_CASHBACK_UNITS_PREFIX = "CRYPTO_CASHBACK_UNITS:";
const CRYPTO_CASHBACK_DATE_PREFIX = "CRYPTO_CASHBACK_DATE:";
const MOVEMENTS_PREFIX = "PORTFOLIO_MOVEMENTS:";

export type CryptoAsset = "BTC" | "ETH";
export type CryptoQuoteMap = Partial<Record<CryptoAsset, number>>;
export type CryptoHistoricalSeriesMap = Partial<Record<CryptoAsset, Array<{ month: string; priceEur: number }>>>;

export interface CryptoNoteMeta {
  asset: CryptoAsset;
  units: number | null;
  cashbackAsset: CryptoAsset;
  cashbackUnits: number | null;
  cashbackDate: string | null;
  userNotes: string;
}

export interface CryptoQuotes {
  pricesEur: CryptoQuoteMap;
  lastUpdatedAt: string;
}

export interface CryptoHistory {
  seriesEur: CryptoHistoricalSeriesMap;
  lastUpdatedAt: string;
}

export interface SerializeInvestmentNotesInput {
  asset?: CryptoAsset;
  units?: number | null;
  cashbackAsset?: CryptoAsset;
  cashbackUnits?: number | null;
  cashbackDate?: string | null;
  movements?: InvestmentMovement[];
  userNotes?: string;
}

const QUOTE_MEMORY_TTL_MS = 45_000;

let quoteMemoryCache: { quote: CryptoQuotes; cachedAt: number } | null = null;
let quoteInFlight: Promise<CryptoQuotes> | null = null;

const parseLooseNumber = (value: string) => {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const normalizeMovementDate = (value: string) => {
  const raw = value.trim();
  if (!raw) return "";

  const isoLike = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoLike) {
    const [, year, month, day] = isoLike;
    return `${year}-${month}-${day}`;
  }

  const ptLike = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ptLike) {
    const [, day, month, year] = ptLike;
    return `${year}-${month}-${day}`;
  }

  return raw;
};

export function parseCryptoNotes(notes?: string): CryptoNoteMeta {
  if (!notes) {
    return {
      asset: "BTC",
      units: null,
      cashbackAsset: "BTC",
      cashbackUnits: null,
      cashbackDate: null,
      userNotes: "",
    };
  }

  const trimmed = notes.trim();
  if (trimmed.startsWith(LEGACY_BTC_UNITS_PREFIX)) {
    const firstLineEnd = trimmed.indexOf("\n");
    const header = firstLineEnd === -1 ? trimmed : trimmed.slice(0, firstLineEnd);
    const valueRaw = header.slice(LEGACY_BTC_UNITS_PREFIX.length).trim();
    const parsed = parseLooseNumber(valueRaw);

    const userNotes = firstLineEnd === -1 ? "" : trimmed.slice(firstLineEnd + 1).trim();

    return {
      asset: "BTC",
      units: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
      cashbackAsset: "BTC",
      cashbackUnits: null,
      cashbackDate: null,
      userNotes,
    };
  }

  const lines = trimmed.split("\n");
  let asset: CryptoAsset = "BTC";
  let units: number | null = null;
  let cashbackAsset: CryptoAsset = "BTC";
  let cashbackUnits: number | null = null;
  let cashbackDate: string | null = null;
  const userNoteLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith(CRYPTO_ASSET_PREFIX)) {
      const value = line.slice(CRYPTO_ASSET_PREFIX.length).trim().toUpperCase();
      if (value === "BTC" || value === "ETH") {
        asset = value;
      }
      continue;
    }

    if (line.startsWith(CRYPTO_UNITS_PREFIX)) {
      const valueRaw = line.slice(CRYPTO_UNITS_PREFIX.length).trim();
      const parsed = parseLooseNumber(valueRaw);
      units = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      continue;
    }

    if (line.startsWith(CRYPTO_CASHBACK_ASSET_PREFIX)) {
      const value = line.slice(CRYPTO_CASHBACK_ASSET_PREFIX.length).trim().toUpperCase();
      if (value === "BTC" || value === "ETH") {
        cashbackAsset = value;
      }
      continue;
    }

    if (line.startsWith(CRYPTO_CASHBACK_UNITS_PREFIX)) {
      const valueRaw = line.slice(CRYPTO_CASHBACK_UNITS_PREFIX.length).trim();
      const parsed = parseLooseNumber(valueRaw);
      cashbackUnits = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      continue;
    }

    if (line.startsWith(CRYPTO_CASHBACK_DATE_PREFIX)) {
      const value = line.slice(CRYPTO_CASHBACK_DATE_PREFIX.length).trim();
      cashbackDate = value || null;
      continue;
    }

    if (line.startsWith(MOVEMENTS_PREFIX)) {
      continue;
    }

    userNoteLines.push(rawLine);
  }

  return {
    asset,
    units,
    cashbackAsset,
    cashbackUnits,
    cashbackDate,
    userNotes: userNoteLines.join("\n").trim(),
  };
}

export function parseInvestmentMovements(notes?: string): InvestmentMovement[] {
  if (!notes) {
    return [];
  }

  const lines = notes.trim().split("\n");
  const rawLine = lines.find((line) => line.trim().startsWith(MOVEMENTS_PREFIX));

  if (!rawLine) {
    return [];
  }

  const payload = rawLine.trim().slice(MOVEMENTS_PREFIX.length).trim();

  try {
    const parsed = JSON.parse(payload) as InvestmentMovement[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id),
        date: normalizeMovementDate(String(item.date)),
        kind: item.kind,
        amount: typeof item.amount === "string"
          ? Number(item.amount.replace(/\s/g, "").replace(",", ".")) || 0
          : Number(item.amount) || 0,
        units: item.units != null
          ? (typeof item.units === "string"
              ? Number(item.units.replace(/\s/g, "").replace(",", "."))
              : Number(item.units))
          : undefined,
        note: item.note ? String(item.note) : undefined,
      }))
      .filter((item) => item.id && item.date && Number.isFinite(item.amount));
  } catch {
    return [];
  }
}

export function serializeInvestmentNotes({
  asset,
  units,
  cashbackAsset,
  cashbackUnits,
  cashbackDate,
  movements,
  userNotes,
}: SerializeInvestmentNotesInput): string | undefined {
  const cleanNotes = (userNotes ?? "").trim();
  const cleanMovements = (movements ?? []).filter((movement) => 
    movement && 
    movement.date && 
    typeof movement.amount === "number" && 
    Number.isFinite(movement.amount)
  );
  const hasMainUnits = !!units && units > 0;
  const hasCashbackUnits = !!cashbackUnits && cashbackUnits > 0;

  const headers: string[] = [];

  if (hasMainUnits && asset) {
    headers.push(`${CRYPTO_ASSET_PREFIX}${asset}`, `${CRYPTO_UNITS_PREFIX}${units}`);
  }

  if (hasCashbackUnits) {
    headers.push(
      `${CRYPTO_CASHBACK_ASSET_PREFIX}${cashbackAsset ?? asset ?? "BTC"}`,
      `${CRYPTO_CASHBACK_UNITS_PREFIX}${cashbackUnits}`,
    );

    if (cashbackDate) {
      headers.push(`${CRYPTO_CASHBACK_DATE_PREFIX}${cashbackDate}`);
    }
  }

  if (cleanMovements.length > 0) {
    headers.push(`${MOVEMENTS_PREFIX}${JSON.stringify(cleanMovements)}`);
  }

  if (!headers.length && !cleanNotes) {
    return undefined;
  }

  return cleanNotes ? `${headers.join("\n")}\n${cleanNotes}` : headers.join("\n") || undefined;
}

export function serializeCryptoNotes(
  asset: CryptoAsset,
  units: number | null,
  userNotes?: string,
  cashbackAsset?: CryptoAsset,
  cashbackUnits?: number | null,
  cashbackDate?: string | null,
): string | undefined {
  return serializeInvestmentNotes({
    asset,
    units,
    cashbackAsset,
    cashbackUnits,
    cashbackDate,
    userNotes,
  });
}

export function resolveInvestmentCurrentValue(investment: Investment, cryptoSpotEur?: CryptoQuoteMap | null): number {
  if (investment.type !== "crypto") {
    return investment.currentValue;
  }

  const { asset, units, cashbackAsset, cashbackUnits } = parseCryptoNotes(investment.notes);
  const spotEur = cryptoSpotEur?.[asset];

  if (units && spotEur && spotEur > 0) {
    return units * spotEur;
  }

  const cashbackSpotEur = cryptoSpotEur?.[cashbackAsset];
  if (!units && cashbackUnits && cashbackSpotEur && cashbackSpotEur > 0) {
    return cashbackUnits * cashbackSpotEur;
  }

  return investment.currentValue;
}

export function resolveCashbackCurrentValue(investment: Investment, cryptoSpotEur?: CryptoQuoteMap | null): number | null {
  if (investment.type !== "crypto") {
    return null;
  }

  const { cashbackAsset, cashbackUnits } = parseCryptoNotes(investment.notes);
  const spotEur = cryptoSpotEur?.[cashbackAsset];

  if (!cashbackUnits || !spotEur || spotEur <= 0) {
    return null;
  }

  return cashbackUnits * spotEur;
}

export function buildSyntheticCryptoCashbackEarnings(
  investments: Investment[],
  cryptoSpotEur?: CryptoQuoteMap | null,
): PortfolioEarning[] {
  return investments.flatMap((investment) => {
    if (investment.type !== "crypto") {
      return [];
    }

    const { cashbackAsset, userNotes } = parseCryptoNotes(investment.notes);
    const cashbackMovements = parseInvestmentMovements(investment.notes)
      .filter((movement) => (
        movement.note !== "Initial position"
        && (movement.kind === "adjustment" || movement.kind === "cashback")
        && !!movement.units
        && movement.units > 0
        && movement.amount > 0
      ));

    if (!cashbackMovements.length) {
      return [];
    }

    return cashbackMovements.map((movement) => ({
      id: `synthetic-crypto-cashback-${investment.id}-${movement.id}`,
      title: investment.name,
      provider: undefined,
      kind: "crypto_cashback" as const,
      date: movement.date,
      amountEur: Math.round(movement.amount * 100) / 100,
      cryptoAsset: cashbackAsset,
      cryptoUnits: movement.units ?? null,
      spotEurAtEarned: movement.units && movement.amount > 0
        ? Math.round((movement.amount / movement.units) * 100) / 100
        : (cryptoSpotEur?.[cashbackAsset] ? Math.round(Number(cryptoSpotEur[cashbackAsset]) * 100) / 100 : null),
      notes: movement.note === "Profit / Return" ? userNotes || undefined : movement.note,
      createdAt: investment.createdAt,
      updatedAt: investment.updatedAt,
    }));
  });
}

export async function fetchCryptoEurQuotes(signal?: AbortSignal): Promise<CryptoQuotes> {
  const cached = quoteMemoryCache;
  if (cached && Date.now() - cached.cachedAt <= QUOTE_MEMORY_TTL_MS) {
    return cached.quote;
  }

  if (quoteInFlight) {
    return quoteInFlight;
  }

  const fetchFromCoinbase = async (): Promise<CryptoQuotes> => {
    const response = await fetch(
      "https://api.coinbase.com/v2/exchange-rates?currency=EUR",
      {
        method: "GET",
        signal,
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Coinbase quotes failed (${response.status})`);
    }

    const data = await response.json() as {
      data?: {
        rates?: Record<string, string>;
      };
    };

    const btcRateRaw = data.data?.rates?.BTC;
    const ethRateRaw = data.data?.rates?.ETH;
    const btcPerEur = btcRateRaw ? Number(btcRateRaw) : NaN;
    const ethPerEur = ethRateRaw ? Number(ethRateRaw) : NaN;

    const btcEur = Number.isFinite(btcPerEur) && btcPerEur > 0 ? 1 / btcPerEur : undefined;
    const ethEur = Number.isFinite(ethPerEur) && ethPerEur > 0 ? 1 / ethPerEur : undefined;

    if ((!btcEur || !Number.isFinite(btcEur)) && (!ethEur || !Number.isFinite(ethEur))) {
      throw new Error("Invalid Coinbase quote payload");
    }

    return {
      pricesEur: {
        ...(btcEur && Number.isFinite(btcEur) ? { BTC: btcEur } : {}),
        ...(ethEur && Number.isFinite(ethEur) ? { ETH: ethEur } : {}),
      },
      lastUpdatedAt: new Date().toISOString(),
    };
  };

  const fetchFromBinance = async (): Promise<CryptoQuotes> => {
    const response = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCEUR%22,%22ETHEUR%22%5D",
      {
        method: "GET",
        signal,
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Binance quotes failed (${response.status})`);
    }

    const data = await response.json() as Array<{ symbol?: string; price?: string }>;
    if (!Array.isArray(data)) {
      throw new Error("Invalid Binance quote payload");
    }

    const btcRaw = data.find((item) => item.symbol === "BTCEUR")?.price;
    const ethRaw = data.find((item) => item.symbol === "ETHEUR")?.price;
    const btcEur = btcRaw ? Number(btcRaw) : undefined;
    const ethEur = ethRaw ? Number(ethRaw) : undefined;

    if ((!btcEur || !Number.isFinite(btcEur)) && (!ethEur || !Number.isFinite(ethEur))) {
      throw new Error("Invalid Binance quote payload");
    }

    return {
      pricesEur: {
        ...(btcEur && Number.isFinite(btcEur) ? { BTC: btcEur } : {}),
        ...(ethEur && Number.isFinite(ethEur) ? { ETH: ethEur } : {}),
      },
      lastUpdatedAt: new Date().toISOString(),
    };
  };

  quoteInFlight = (async () => {
    try {
      const primary = await fetchFromCoinbase();
      quoteMemoryCache = { quote: primary, cachedAt: Date.now() };
      return primary;
    } catch {
      const fallback = await fetchFromBinance();
      quoteMemoryCache = { quote: fallback, cachedAt: Date.now() };
      return fallback;
    } finally {
      quoteInFlight = null;
    }
  })();

  return quoteInFlight;
}

async function fetchCryptoAssetMonthlyHistory(asset: CryptoAsset, signal?: AbortSignal): Promise<Array<{ month: string; priceEur: number }>> {
  const assetId = asset === "BTC" ? "bitcoin" : "ethereum";
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${assetId}/market_chart?vs_currency=eur&days=365&interval=daily`,
    {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${asset} history (${response.status})`);
  }

  const data = await response.json() as {
    prices?: Array<[number, number]>;
  };

  if (!Array.isArray(data.prices)) {
    throw new Error(`Invalid ${asset} history payload`);
  }

  const latestPointByMonth = new Map<string, { timestamp: number; priceEur: number }>();

  data.prices.forEach(([timestamp, priceEur]) => {
    if (!Number.isFinite(timestamp) || !Number.isFinite(priceEur)) {
      return;
    }

    const month = new Date(timestamp).toISOString().slice(0, 7);
    const existing = latestPointByMonth.get(month);
    if (!existing || timestamp > existing.timestamp) {
      latestPointByMonth.set(month, { timestamp, priceEur });
    }
  });

  return Array.from(latestPointByMonth.entries())
    .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
    .map(([month, point]) => ({
      month,
      priceEur: point.priceEur,
    }));
}

export async function fetchCryptoHistoricalEurPrices(signal?: AbortSignal): Promise<CryptoHistory> {
  const assets: CryptoAsset[] = ["BTC", "ETH"];
  const results = await Promise.allSettled(
    assets.map((asset) => fetchCryptoAssetMonthlyHistory(asset, signal)),
  );

  const seriesEur: CryptoHistoricalSeriesMap = {};

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.length > 0) {
      seriesEur[assets[index]] = result.value;
    }
  });

  if (!seriesEur.BTC?.length && !seriesEur.ETH?.length) {
    const rejected = results.find((result) => result.status === "rejected");
    throw rejected?.status === "rejected"
      ? rejected.reason instanceof Error
        ? rejected.reason
        : new Error("Failed to fetch crypto history")
      : new Error("Failed to fetch crypto history");
  }

  return {
    seriesEur,
    lastUpdatedAt: new Date().toISOString(),
  };
}
