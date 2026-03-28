import { useEffect, useState } from "react";
import { CryptoQuoteMap, fetchCryptoEurQuotes } from "@/features/portfolio/lib/crypto";

const REFRESH_INTERVAL_MS = 60_000;
const QUOTE_CACHE_KEY = "portfolio.crypto-quotes.v1";
const QUOTE_CACHE_TTL_MS = 60_000;

type CachedCryptoQuote = {
  pricesEur: CryptoQuoteMap;
  lastUpdatedAt: string | null;
  cachedAt: number;
};

const readCachedQuote = (): CachedCryptoQuote | null => {
  try {
    const raw = sessionStorage.getItem(QUOTE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedCryptoQuote;
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() - parsed.cachedAt > QUOTE_CACHE_TTL_MS) return null;

    return parsed;
  } catch {
    return null;
  }
};

const writeCachedQuote = (quote: { pricesEur: CryptoQuoteMap; lastUpdatedAt: string | null }) => {
  try {
    sessionStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify({ ...quote, cachedAt: Date.now() }));
  } catch {
    // no-op
  }
};

export function useCryptoQuotes(enabled = true) {
  const cachedQuote = enabled ? readCachedQuote() : null;
  const [pricesEur, setPricesEur] = useState<CryptoQuoteMap>(cachedQuote?.pricesEur ?? {});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(cachedQuote?.lastUpdatedAt ?? null);
  const [loading, setLoading] = useState(enabled && !cachedQuote);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPricesEur({});
      setLastUpdatedAt(null);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        setError(null);
        const quote = await fetchCryptoEurQuotes(controller.signal);
        if (!mounted) return;

        setPricesEur(quote.pricesEur);
        setLastUpdatedAt(quote.lastUpdatedAt);
        writeCachedQuote(quote);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to fetch crypto quotes");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [enabled]);

  return { pricesEur, lastUpdatedAt, loading, error };
}

export function useBtcQuote() {
  const { pricesEur, lastUpdatedAt, loading, error } = useCryptoQuotes();

  return {
    priceEur: pricesEur.BTC ?? null,
    lastUpdatedAt,
    loading,
    error,
  };
}
