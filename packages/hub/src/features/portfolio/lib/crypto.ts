import { Investment } from "@/features/portfolio/types/investment";

const LEGACY_BTC_UNITS_PREFIX = "BTC_UNITS:";
const CRYPTO_ASSET_PREFIX = "CRYPTO_ASSET:";
const CRYPTO_UNITS_PREFIX = "CRYPTO_UNITS:";

export type CryptoAsset = "BTC" | "ETH";
export type CryptoQuoteMap = Partial<Record<CryptoAsset, number>>;

export interface CryptoNoteMeta {
  asset: CryptoAsset;
  units: number | null;
  userNotes: string;
}

export interface CryptoQuotes {
  pricesEur: CryptoQuoteMap;
  lastUpdatedAt: string;
}

export function parseCryptoNotes(notes?: string): CryptoNoteMeta {
  if (!notes) {
    return { asset: "BTC", units: null, userNotes: "" };
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
      userNotes,
    };
  }

  const lines = trimmed.split("\n");
  let asset: CryptoAsset = "BTC";
  let units: number | null = null;
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

    userNoteLines.push(rawLine);
  }

  return {
    asset,
    units,
    userNotes: userNoteLines.join("\n").trim(),
  };
}

export function serializeCryptoNotes(asset: CryptoAsset, units: number | null, userNotes?: string): string | undefined {
  const cleanNotes = (userNotes ?? "").trim();

  if (!units || units <= 0) {
    return cleanNotes || undefined;
  }

  const headers = [`${CRYPTO_ASSET_PREFIX}${asset}`, `${CRYPTO_UNITS_PREFIX}${units}`];
  return cleanNotes ? `${headers.join("\n")}\n${cleanNotes}` : headers.join("\n");
}

export function resolveInvestmentCurrentValue(investment: Investment, cryptoSpotEur?: CryptoQuoteMap | null): number {
  if (investment.type !== "crypto") {
    return investment.currentValue;
  }

  const { asset, units } = parseCryptoNotes(investment.notes);
  const spotEur = cryptoSpotEur?.[asset];

  if (!units || !spotEur || spotEur <= 0) {
    return investment.currentValue;
  }

  return units * spotEur;
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
