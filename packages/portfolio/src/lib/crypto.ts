import { Investment } from "@/types/investment";

const BTC_UNITS_PREFIX = "BTC_UNITS:";

export interface CryptoNoteMeta {
  btcUnits: number | null;
  userNotes: string;
}

export interface BtcQuote {
  eur: number;
  lastUpdatedAt: string;
}

export function parseCryptoNotes(notes?: string): CryptoNoteMeta {
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
