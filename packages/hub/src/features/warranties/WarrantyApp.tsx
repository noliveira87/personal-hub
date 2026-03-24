import { useEffect, useMemo, useState } from "react";
import {
  addWarrantyToDb,
  archiveWarrantyInDb,
  deleteReceiptByUrl,
  deleteWarrantyFromDb,
  getStatus,
  loadWarranties,
  type WarrantyCategory,
  type Warranty,
  type WarrantyStatus,
  unarchiveWarrantyInDb,
  updateWarrantyInDb,
} from "@/lib/warranties";
import { AddWarrantyDialog } from "./AddWarrantyDialog";
import { WarrantyCard } from "./WarrantyCard";
import { Input } from "@/components/ui/input";
import { Search, ShieldCheck } from "lucide-react";
import { loadAlertSettings, loadTelegramConfig, sendTelegramMessage } from "@/lib/telegram";
import AppSectionHeader from "@/components/AppSectionHeader";
import { useSearchParams } from "react-router-dom";

const FILTERS: { label: string; value: WarrantyStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Expiring", value: "expiring" },
  { label: "Expired", value: "expired" },
];

const CATEGORY_FILTERS: { label: string; value: WarrantyCategory | "all" }[] = [
  { label: "All types", value: "all" },
  { label: "Tech", value: "tech" },
  { label: "Appliances", value: "appliances" },
  { label: "Others", value: "others" },
];

const SENT_ALERTS_KEY = 'd12-warranty-alerts-sent';
const PENDING_ALERTS_KEY = 'd12-warranty-alerts-pending';
const EXPIRING_WARRANTIES_URL = 'https://hub.cafofo12.ddns.net/warranties?status=expiring';

function parseStatusFilter(value: string | null): WarrantyStatus | 'all' {
  if (value === 'active' || value === 'expiring' || value === 'expired') {
    return value;
  }

  return 'all';
}

function parseCategoryFilter(value: string | null): WarrantyCategory | 'all' {
  if (value === 'tech' || value === 'appliances' || value === 'others') {
    return value;
  }

  return 'all';
}

function getTodayKey(): string {
  return new Date().toDateString();
}

function getWarrantyAlertSignature(warranty: Warranty): string {
  return `${warranty.id}:${warranty.expirationDate}`;
}

function loadSentWarrantyAlerts(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(SENT_ALERTS_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSentWarrantyAlerts(sentMap: Record<string, string[]>): void {
  localStorage.setItem(SENT_ALERTS_KEY, JSON.stringify(sentMap));
}

function loadPendingWarrantyAlerts(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(PENDING_ALERTS_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function savePendingWarrantyAlerts(pendingMap: Record<string, string[]>): void {
  localStorage.setItem(PENDING_ALERTS_KEY, JSON.stringify(pendingMap));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function WarrantyApp() {
  const [searchParams] = useSearchParams();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<WarrantyStatus | "all">(() => parseStatusFilter(searchParams.get('status')));
  const [categoryFilter, setCategoryFilter] = useState<WarrantyCategory | "all">(() => parseCategoryFilter(searchParams.get('category')));
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? "");
  const [showArchived, setShowArchived] = useState(() => searchParams.get('archived') === 'true');

  useEffect(() => {
    let isMounted = true;

    const fetchWarranties = async () => {
      setIsLoading(true);
      const data = await loadWarranties();
      if (!isMounted) return;
      setWarranties(data);
      setIsLoading(false);

      // Send Telegram alerts for expiring warranties
      const alertSettings = await loadAlertSettings();
      const telegramConfig = await loadTelegramConfig();
      const isTelegramReady = Boolean(telegramConfig.botToken.trim() && telegramConfig.chatId.trim());

      if (alertSettings.warrantiesEnabled && isTelegramReady) {
        const todayKey = getTodayKey();
        const sentMap = loadSentWarrantyAlerts();
        const pendingMap = loadPendingWarrantyAlerts();
        const sentToday = new Set(sentMap[todayKey] ?? []);
        const pendingToday = new Set(pendingMap[todayKey] ?? []);

        const expiring = data.filter(w => {
          if (w.archivedAt) return false;
          const status = getStatus(w);
          if (status === 'expired') return false;
          const days = Math.ceil((new Date(w.expirationDate).getTime() - Date.now()) / 86400000);
          if (!(days >= 0 && days <= alertSettings.warrantyAlertDays)) return false;

          const signature = getWarrantyAlertSignature(w);
          return !sentToday.has(signature) && !pendingToday.has(signature);
        });

        if (expiring.length > 0) {
          const reservedSignatures = expiring.map(getWarrantyAlertSignature);
          pendingMap[todayKey] = [
            ...pendingToday,
            ...reservedSignatures,
          ];
          savePendingWarrantyAlerts(pendingMap);

          try {
            for (const warranty of expiring) {
              const days = Math.ceil((new Date(warranty.expirationDate).getTime() - Date.now()) / 86400000);
              const signature = getWarrantyAlertSignature(warranty);

              await sendTelegramMessage(
                `🛡️ <b>Warranty Vault — Expiry Alert</b>\n\n• ${warranty.productName} — <b>${days}d</b> remaining\n\n<a href="${EXPIRING_WARRANTIES_URL}">Open expiring warranties</a>`
              );

              sentMap[todayKey] = unique([
                ...(sentMap[todayKey] ?? []),
                signature,
              ]);
              saveSentWarrantyAlerts(sentMap);

              pendingMap[todayKey] = (pendingMap[todayKey] ?? []).filter(
                (pendingSignature) => pendingSignature !== signature
              );
              savePendingWarrantyAlerts(pendingMap);
            }
          } catch (error) {
            const nextPendingToday = (pendingMap[todayKey] ?? []).filter(
              (signature) => !reservedSignatures.includes(signature)
            );
            pendingMap[todayKey] = nextPendingToday;
            savePendingWarrantyAlerts(pendingMap);
            console.error('Failed to send warranty Telegram alert:', error);
          }
        }
      }
    };

    void fetchWarranties();

    return () => {
      isMounted = false;
    };
  }, []);

  const addWarranty = async (warranty: Warranty) => {
    try {
      await addWarrantyToDb(warranty);
      setWarranties((prev) => [warranty, ...prev]);
    } catch (error) {
      console.error("Error adding warranty:", error);
    }
  };

  const editWarranty = async (updated: Warranty) => {
    try {
      await updateWarrantyInDb(updated);
      setWarranties((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch (error) {
      console.error("Error updating warranty:", error);
    }
  };

  const deleteWarranty = async (id: string) => {
    try {
      const warrantyToDelete = warranties.find((w) => w.id === id);

      if (warrantyToDelete?.receiptDataUrl) {
        await deleteReceiptByUrl(warrantyToDelete.receiptDataUrl);
      }

      await deleteWarrantyFromDb(id);
      setWarranties((prev) => prev.filter((w) => w.id !== id));
    } catch (error) {
      console.error("Error deleting warranty:", error);
      alert(
        error instanceof Error
          ? `Failed to delete product: ${error.message}`
          : "Failed to delete product. Please try again."
      );
    }
  };

  const archiveWarranty = async (id: string) => {
    try {
      await archiveWarrantyInDb(id);
      setWarranties((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, archivedAt: new Date().toISOString() } : w
        )
      );
    } catch (error) {
      console.error("Error archiving warranty:", error);
    }
  };

  const unarchiveWarranty = async (id: string) => {
    try {
      await unarchiveWarrantyInDb(id);
      setWarranties((prev) =>
        prev.map((w) => (w.id === id ? { ...w, archivedAt: undefined } : w))
      );
    } catch (error) {
      console.error("Error unarchiving warranty:", error);
    }
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = warranties.filter((warranty) => {
      // Filtro de arquivamento - mostrar APENAS archived ou APENAS não-archived
      if (showArchived && !warranty.archivedAt) return false;
      if (!showArchived && warranty.archivedAt) return false;

      const statusMatches = filter === "all" || getStatus(warranty) === filter;
      const categoryMatches = categoryFilter === "all" || warranty.category === categoryFilter;

      if (!query) {
        return statusMatches && categoryMatches;
      }

      const productMatches = warranty.productName.toLowerCase().includes(query);
      const supplierMatches = (warranty.purchasedFrom ?? "").toLowerCase().includes(query);

      return statusMatches && categoryMatches && (productMatches || supplierMatches);
    });

    // Ordenação condicional
    const isBaseOverview = filter === "all" && categoryFilter === "all" && !query;

    if (isBaseOverview) {
      // Vista base: agrupar por status (Active → Expiring → Expired) e depois A-Z
      const statusOrder = { active: 0, expiring: 1, expired: 2 };
      return filtered.sort((a, b) => {
        const statusA = statusOrder[getStatus(a)];
        const statusB = statusOrder[getStatus(b)];
        if (statusA !== statusB) return statusA - statusB;
        return a.productName.localeCompare(b.productName);
      });
    } else {
      // Qualquer vista filtrada: ordenar por nome do produto (A-Z)
      return filtered.sort((a, b) => a.productName.localeCompare(b.productName));
    }
  }, [warranties, filter, categoryFilter, searchQuery, showArchived]);

  const counts = useMemo(() => {
    const toCount = warranties.filter((w) =>
      showArchived ? w.archivedAt : !w.archivedAt
    );
    const c = { all: toCount.length, active: 0, expiring: 0, expired: 0 };
    toCount.forEach((w) => c[getStatus(w)]++);
    return c;
  }, [warranties, showArchived]);

  const categoryCounts = useMemo(() => {
    const toCount = warranties.filter((w) =>
      showArchived ? w.archivedAt : !w.archivedAt
    );
    const c: Record<WarrantyCategory | "all", number> = {
      all: toCount.length,
      tech: 0,
      appliances: 0,
      others: 0,
    };

    toCount.forEach((w) => {
      c[w.category]++;
    });

    return c;
  }, [warranties, showArchived]);

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader
        title="D12 Warranties"
        icon={ShieldCheck}
        actions={<AddWarrantyDialog onAdd={addWarranty} />}
      />

      <div className="max-w-lg mx-auto px-4 pt-20 pb-24">
        {/* Mobile title */}
        <div className="flex items-center gap-3 mb-6 sm:hidden">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">D12 Warranties</h1>
            <p className="text-sm text-muted-foreground">
              {warranties.length} product{warranties.length !== 1 ? "s" : ""} tracked
            </p>
          </div>
        </div>

        {/* Filters */}
        {warranties.length > 0 && (
          <div className="fade-in-up space-y-2 mb-6" style={{ animationDelay: "100ms" }}>
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by product or supplier"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-[0.96] ${
                    filter === f.value
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  }`}
                >
                  {f.label}
                  {counts[f.value] > 0 && (
                    <span className="ml-1.5 opacity-60">{counts[f.value]}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setCategoryFilter(f.value)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all active:scale-[0.96] ${
                    categoryFilter === f.value
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  }`}
                >
                  {f.label}
                  {categoryCounts[f.value] > 0 && (
                    <span className="ml-1.5 opacity-60">{categoryCounts[f.value]}</span>
                  )}
                </button>
              ))}
            </div>

            {warranties.some((w) => w.archivedAt) && (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  id="show-archived"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="cursor-pointer rounded"
                />
                <label htmlFor="show-archived" className="cursor-pointer text-muted-foreground">
                  Show archived
                </label>
              </div>
            )}
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {isLoading && (
            <div className="fade-in-up text-center py-12">
              <p className="text-sm text-muted-foreground">Loading warranties...</p>
            </div>
          )}

          {!isLoading && filtered.map((w, i) => (
            <WarrantyCard
              key={w.id}
              warranty={w}
              onDelete={deleteWarranty}
              onEdit={editWarranty}
              onArchive={archiveWarranty}
              onUnarchive={unarchiveWarranty}
              index={i}
            />
          ))}
        </div>

        {/* Empty state */}
        {!isLoading && warranties.length === 0 && (
          <div className="fade-in-up text-center py-20" style={{ animationDelay: "150ms" }}>
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">No warranties yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first product to start tracking
            </p>
          </div>
        )}

        {filtered.length === 0 && warranties.length > 0 && (
          <div className="fade-in-up text-center py-12">
            <p className="text-sm text-muted-foreground">No warranties match the selected filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
