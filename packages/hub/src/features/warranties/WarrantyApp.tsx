import { useEffect, useMemo, useState } from "react";
import {
  addWarrantyToDb,
  archiveWarrantyInDb,
  deleteReceiptByUrl,
  deleteWarrantyFromDb,
  getDaysLeft,
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
import AppLoadingState from "@/components/AppLoadingState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Search, ShieldCheck } from "lucide-react";
import AppSectionHeader from "@/components/AppSectionHeader";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "@/components/ui/sonner";

const FILTER_VALUES: Array<WarrantyStatus | "all"> = ["all", "active", "expiring", "expired"];
const CATEGORY_FILTER_VALUES: Array<WarrantyCategory | "all"> = ["all", "tech", "appliances", "tools", "others"];
const CATEGORY_ORDER: WarrantyCategory[] = ["tech", "appliances", "tools", "others"];

const CATEGORY_STYLES: Record<WarrantyCategory, { dot: string; panel: string; chip: string }> = {
  tech: {
    dot: "bg-sky-500",
    panel: "border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-background to-background",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  appliances: {
    dot: "bg-emerald-500",
    panel: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-background",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  tools: {
    dot: "bg-indigo-500",
    panel: "border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-background to-background",
    chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  },
  others: {
    dot: "bg-amber-500",
    panel: "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
};

function parseStatusFilter(value: string | null): WarrantyStatus | "all" {
  if (value === "active" || value === "expiring" || value === "expired") {
    return value;
  }

  return "all";
}

function parseCategoryFilter(value: string | null): WarrantyCategory | "all" {
  if (value === "tech" || value === "appliances" || value === "tools" || value === "others") {
    return value;
  }

  return "all";
}

export function WarrantyApp() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<WarrantyStatus | "all">(() => parseStatusFilter(searchParams.get("status")));
  const [categoryFilter, setCategoryFilter] = useState<WarrantyCategory | "all">(() => parseCategoryFilter(searchParams.get("category")));
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [showArchived, setShowArchived] = useState(() => searchParams.get("archived") === "true");
  const [expandedCategories, setExpandedCategories] = useState<Record<WarrantyCategory, boolean>>({
    tech: false,
    appliances: false,
    tools: false,
    others: false,
  });

  const filterOptions = useMemo(() => (
    FILTER_VALUES.map((value) => ({
      value,
      label: t(`warranties.filters.status.${value}`),
    }))
  ), [t]);

  const categoryFilterOptions = useMemo(() => (
    CATEGORY_FILTER_VALUES.map((value) => ({
      value,
      label: t(`warranties.filters.category.${value}`),
    }))
  ), [t]);

  const categoryLabels = useMemo<Record<WarrantyCategory, string>>(() => ({
    tech: t("warranties.category.tech"),
    appliances: t("warranties.category.appliances"),
    tools: t("warranties.category.tools"),
    others: t("warranties.category.others"),
  }), [t]);

  useEffect(() => {
    let isMounted = true;

    const fetchWarranties = async () => {
      setIsLoading(true);
      const data = await loadWarranties();
      if (!isMounted) return;
      setWarranties(data);
      setIsLoading(false);
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
      toast.error(
        error instanceof Error
          ? t("warranties.errors.deleteWithMessage", { message: error.message })
          : t("warranties.errors.delete"),
      );
    }
  };

  const archiveWarranty = async (id: string) => {
    try {
      await archiveWarrantyInDb(id);
      setWarranties((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, archivedAt: new Date().toISOString() } : w,
        ),
      );
    } catch (error) {
      console.error("Error archiving warranty:", error);
    }
  };

  const unarchiveWarranty = async (id: string) => {
    try {
      await unarchiveWarrantyInDb(id);
      setWarranties((prev) =>
        prev.map((w) => (w.id === id ? { ...w, archivedAt: undefined } : w)),
      );
    } catch (error) {
      console.error("Error unarchiving warranty:", error);
    }
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return warranties.filter((warranty) => {
      if (showArchived && !warranty.archivedAt) return false;
      if (!showArchived && warranty.archivedAt) return false;

      const warrantyStatus = getStatus(warranty);
      if (warrantyStatus === "expired" && filter !== "expired") return false;

      const statusMatches = filter === "all" || warrantyStatus === filter;
      const categoryMatches = categoryFilter === "all" || warranty.category === categoryFilter;

      if (!query) {
        return statusMatches && categoryMatches;
      }

      const productMatches = warranty.productName.toLowerCase().includes(query);
      const supplierMatches = (warranty.purchasedFrom ?? "").toLowerCase().includes(query);

      return statusMatches && categoryMatches && (productMatches || supplierMatches);
    });
  }, [warranties, filter, categoryFilter, searchQuery, showArchived]);

  const groupedFiltered = useMemo(() => {
    const statusOrder = { active: 0, expiring: 1, expired: 2 };
    const availableCategories = categoryFilter === "all" ? CATEGORY_ORDER : [categoryFilter];

    let runningIndex = 0;
    return availableCategories
      .map((category) => {
        const warrantiesInCategory = filtered
          .filter((warranty) => warranty.category === category)
          .sort((a, b) => {
            if (filter === "all") {
              const statusA = statusOrder[getStatus(a)];
              const statusB = statusOrder[getStatus(b)];
              if (statusA !== statusB) {
                return statusA - statusB;
              }
            }

            return a.productName.localeCompare(b.productName);
          });

        const startIndex = runningIndex;
        runningIndex += warrantiesInCategory.length;

        return {
          category,
          label: categoryLabels[category],
          warranties: warrantiesInCategory,
          startIndex,
        };
      })
      .filter((group) => group.warranties.length > 0);
  }, [filtered, categoryFilter, filter, categoryLabels]);

  const counts = useMemo(() => {
    const toCount = warranties.filter((w) =>
      showArchived ? w.archivedAt : !w.archivedAt,
    );
    const c = { all: toCount.length, active: 0, expiring: 0, expired: 0 };
    toCount.forEach((w) => c[getStatus(w)]++);
    return c;
  }, [warranties, showArchived]);

  const categoryCounts = useMemo(() => {
    const toCount = warranties.filter((w) =>
      showArchived ? w.archivedAt : !w.archivedAt,
    );
    const c: Record<WarrantyCategory | "all", number> = {
      all: toCount.length,
      tech: 0,
      appliances: 0,
      tools: 0,
      others: 0,
    };

    toCount.forEach((w) => {
      c[w.category]++;
    });

    return c;
  }, [warranties, showArchived]);

  const nextExpiringWarranty = useMemo(() => {
    const nonArchived = warranties.filter((w) => !w.archivedAt && getDaysLeft(w) >= 0);

    if (nonArchived.length === 0) {
      return null;
    }

    return [...nonArchived].sort(
      (a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime(),
    )[0];
  }, [warranties]);

  const nextExpiringDaysLeft = nextExpiringWarranty ? getDaysLeft(nextExpiringWarranty) : null;

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader
        title={t("warranties.title")}
        icon={ShieldCheck}
        actions={(
          <AddWarrantyDialog
            onAdd={addWarranty}
            trigger={(
              <Button
                className="h-10 w-10 rounded-xl sm:h-9 sm:w-auto sm:rounded-lg sm:px-3"
                aria-label={t("warranties.addProduct")}
                title={t("warranties.addProduct")}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("warranties.addProduct")}</span>
              </Button>
            )}
          />
        )}
      />

      <div className="max-w-2xl mx-auto px-4 pt-16 pb-24">
        <div className="fade-in-up mb-6 rounded-2xl border bg-card p-4 space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("warranties.overview")}</p>
              <p className="text-xl font-bold leading-tight">{t("warranties.trackedCount", { count: warranties.length })}</p>
              {nextExpiringWarranty && nextExpiringDaysLeft !== null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("warranties.nextToExpire")}: <span className="font-medium text-foreground">{nextExpiringWarranty.productName}</span>{" "}
                  {t("warranties.in")} {nextExpiringDaysLeft} {nextExpiringDaysLeft === 1 ? t("warranties.day") : t("warranties.days")}
                </p>
              )}
            </div>
          </div>
        </div>

        {warranties.length > 0 && (
          <div className="fade-in-up space-y-2 mb-4 sm:mb-6" style={{ animationDelay: "100ms" }}>
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder={t("warranties.filters.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:hidden">
              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("warranties.filters.statusLabel")}</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as WarrantyStatus | "all")}
                  className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm"
                >
                  {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                      {counts[option.value] > 0 ? ` (${counts[option.value]})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("warranties.filters.categoryLabel")}</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as WarrantyCategory | "all")}
                  className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm"
                >
                  {categoryFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                      {categoryCounts[option.value] > 0 ? ` (${categoryCounts[option.value]})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="hidden sm:flex gap-2 overflow-x-auto pb-1">
              {filterOptions.map((f) => (
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

            <div className="hidden sm:flex gap-2 overflow-x-auto pb-1">
              {categoryFilterOptions.map((f) => (
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
                <label htmlFor="show-archived" className="cursor-pointer text-muted-foreground">{t("warranties.showArchived")}</label>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {isLoading && (
            <div className="fade-in-up py-2">
              <AppLoadingState label={t("warranties.loading")} variant="list" />
            </div>
          )}

          {!isLoading && groupedFiltered.map((group) => (
            <section key={group.category} className={`space-y-3 rounded-2xl border p-3 sm:p-4 ${CATEGORY_STYLES[group.category].panel}`}>
              <button
                type="button"
                onClick={() => setExpandedCategories((prev) => ({ ...prev, [group.category]: !prev[group.category] }))}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2 backdrop-blur"
                aria-expanded={expandedCategories[group.category]}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${CATEGORY_STYLES[group.category].dot}`} />
                  <p className="truncate text-sm font-semibold tracking-wide text-foreground">
                    {group.label}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${CATEGORY_STYLES[group.category].chip}`}>
                    {group.warranties.length}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedCategories[group.category] ? "rotate-180" : ""}`} />
                </div>
              </button>

              {expandedCategories[group.category] && (
                <div className="space-y-3">
                  {group.warranties.map((warranty, indexInGroup) => (
                    <WarrantyCard
                      key={warranty.id}
                      warranty={warranty}
                      onDelete={deleteWarranty}
                      onEdit={editWarranty}
                      onArchive={archiveWarranty}
                      onUnarchive={unarchiveWarranty}
                      index={group.startIndex + indexInGroup}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {!isLoading && warranties.length === 0 && (
          <div className="fade-in-up text-center py-20" style={{ animationDelay: "150ms" }}>
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">{t("warranties.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("warranties.emptySubtitle")}</p>
          </div>
        )}

        {filtered.length === 0 && warranties.length > 0 && (
          <div className="fade-in-up text-center py-12">
            <p className="text-sm text-muted-foreground">{t("warranties.noMatch")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
