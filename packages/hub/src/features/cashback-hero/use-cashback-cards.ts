import { useCallback, useEffect, useState } from 'react';
import {
  addCashbackCard,
  loadCashbackCards,
  removeCashbackCard,
  replaceAllCashbackCards,
} from '@/features/cashback-hero/lib/cashback';

const LEGACY_STORAGE_KEY = 'cashback_hero_cards';
const DEFAULT_CARDS = ['Unibanco', 'Cetelem', 'Wizink', 'Santander'];

function readLegacyCards(): string[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const result: string[] = [];

    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(trimmed);
    }

    return result;
  } catch {
    return [];
  }
}

export function useCashbackCards() {
  const [cards, setCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadCashbackCards();
      if (data.length > 0) {
        setCards(data);
      } else {
        const legacyCards = readLegacyCards();
        const seedCards = legacyCards.length > 0 ? legacyCards : DEFAULT_CARDS;
        await replaceAllCashbackCards(seedCards);
        if (legacyCards.length > 0) {
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        setCards([...seedCards]);
      }
    } catch (err) {
      console.warn('Failed to load cashback cards, falling back to defaults:', err);
      setCards([...DEFAULT_CARDS]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addCard = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (cards.some((card) => card.toLowerCase() === trimmed.toLowerCase())) return;
    await addCashbackCard(trimmed, cards.length);
    setCards((prev) => [...prev, trimmed]);
  }, [cards]);

  const removeCard = useCallback(async (name: string) => {
    await removeCashbackCard(name);
    setCards((prev) => prev.filter((card) => card !== name));
  }, []);

  const reorderCards = useCallback(async (orderedCards: string[]) => {
    await replaceAllCashbackCards(orderedCards);
    setCards([...orderedCards]);
  }, []);

  const resetCards = useCallback(async () => {
    await replaceAllCashbackCards(DEFAULT_CARDS);
    setCards([...DEFAULT_CARDS]);
  }, []);

  return { cards, loading, addCard, removeCard, reorderCards, resetCards };
}
