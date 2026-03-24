import { useEffect, useState } from "react";
import { fetchBtcEurQuote } from "@/lib/crypto";

const REFRESH_INTERVAL_MS = 60_000;

export function useBtcQuote() {
  const [priceEur, setPriceEur] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        setError(null);
        const quote = await fetchBtcEurQuote(controller.signal);
        if (!mounted) return;

        setPriceEur(quote.eur);
        setLastUpdatedAt(quote.lastUpdatedAt);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to fetch BTC quote");
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
  }, []);

  return { priceEur, lastUpdatedAt, loading, error };
}
