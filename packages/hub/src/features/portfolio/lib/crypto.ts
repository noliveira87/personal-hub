import { Investment, InvestmentMovement } from "@/features/portfolio/types/investment";

const LEGACY_BTC_UNITS_PREFIX = "BTC_UNITS:";
const CRYPTO_ASSET_PREFIX = "CRYPTO_ASSET:";
const CRYPTO_UNITS_PREFIX = "CRYPTO_UNITS:";
const CRYPTO_CASHBACK_ASSET_PREFIX = "CRYPTO_CASHBACK_ASSET:";
const CRYPTO_CASHBACK_UNITS_PREFIX = "CRYPTO_CASHBACK_UNITS:";
const CRYPTO_CASHBACK_DATE_PREFIX = "CRYPTO_CASHBACK_DATE:";
const MOVEMENTS_PREFIX = "PORTFOLIO_MOVEMENTS:";

export type CryptoAsset = "BTC" | "ETH";
export type CryptoQuoteMap = Partial<Record<CryptoAsset, number>>;

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

export interface SerializeInvestmentNotesInput {
  asset?: CryptoAsset;
  units?: number | null;
  cashbackAsset?: CryptoAsset;
  cashbackUnits?: number | null;
  cashbackDate?: string | null;
  movements?: InvestmentMovement[];
  userNotes?: string;
}

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
    const parsed = Number(valueRaw);

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
      const parsed = Number(valueRaw);
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
      const parsed = Number(valueRaw);
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
        date: String(item.date),
        kind: item.kind,
        amount: Number(item.amount) || 0,
        units: item.units != null ? Number(item.units) : undefined,
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

export async function fetchCryptoEurQuotes(signal?: AbortSignal): Promise<CryptoQuotes> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=eur&include_last_updated_at=true",
    {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch crypto quotes (${response.status})`);
  }

  const data = await response.json() as {
    bitcoin?: { eur?: number; last_updated_at?: number };
    ethereum?: { eur?: number; last_updated_at?: number };
  };

  const btcEur = data.bitcoin?.eur;
  const ethEur = data.ethereum?.eur;

  if ((!btcEur || !Number.isFinite(btcEur)) && (!ethEur || !Number.isFinite(ethEur))) {
    throw new Error("Invalid crypto quote payload");
  }

  const lastUpdatedAtUnix = Math.max(
    data.bitcoin?.last_updated_at ?? 0,
    data.ethereum?.last_updated_at ?? 0,
  );

  const lastUpdatedAt =
    typeof lastUpdatedAtUnix === "number" && Number.isFinite(lastUpdatedAtUnix)
      ? new Date(lastUpdatedAtUnix * 1000).toISOString()
      : new Date().toISOString();

  const pricesEur: CryptoQuoteMap = {
    ...(btcEur && Number.isFinite(btcEur) ? { BTC: btcEur } : {}),
    ...(ethEur && Number.isFinite(ethEur) ? { ETH: ethEur } : {}),
  };

  return { pricesEur, lastUpdatedAt };
}
