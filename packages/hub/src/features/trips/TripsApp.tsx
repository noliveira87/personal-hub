import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/features/trips/components/Header";
import { TripCard } from "@/features/trips/components/TripCard";
import { TripDetail } from "@/features/trips/components/TripDetail";
import { TripForm } from "@/features/trips/components/TripForm";
import { TripsWorldMap } from "@/features/trips/components/TripsWorldMap";
import { createTrip, deleteTrip, loadTrips, updateTrip } from "@/lib/trips";
import { Trip } from "@/features/trips/types/trip";
import { useEffect } from "react";
import {
  getLocalizedTripDestination,
  getLocalizedTripTitle,
  getTripDestinationCount,
  getTripsOutsidePortugalCount,
} from "@/features/trips/utils/locations";
import { useI18n } from "@/i18n/I18nProvider";
import { getTripTotal } from "@/features/trips/utils/totals";

type View = "dashboard" | "detail" | "add" | "edit";
type EditableTripFields = Omit<Trip, "id" | "createdAt" | "updatedAt">;
const EDITABLE_TRIP_KEYS: Array<keyof EditableTripFields> = [
  "title",
  "destination",
  "startDate",
  "endDate",
  "cost",
  "photos",
  "hotels",
  "foods",
  "notes",
  "tags",
  "travel",
  "tickets",
  "expenses",
];

const hasSameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

const buildTripChanges = (current: Trip, next: EditableTripFields): Partial<EditableTripFields> => {
  const changes: Partial<Record<keyof EditableTripFields, unknown>> = {};
  const currentEditable: Record<keyof EditableTripFields, unknown> = {
    title: current.title,
    destination: current.destination,
    startDate: current.startDate,
    endDate: current.endDate,
    cost: current.cost,
    photos: current.photos,
    hotels: current.hotels,
    foods: current.foods,
    notes: current.notes,
    tags: current.tags,
    travel: current.travel,
    tickets: current.tickets,
    expenses: current.expenses,
  };
  const nextEditable = next as unknown as Record<keyof EditableTripFields, unknown>;

  EDITABLE_TRIP_KEYS.forEach((key) => {
    if (!hasSameValue(currentEditable[key], nextEditable[key])) {
      changes[key] = nextEditable[key];
    }
  });

  return changes as Partial<EditableTripFields>;
};

export function TripsApp() {
  const { t, formatCurrency, language } = useI18n();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchTrips = async () => {
      const data = await loadTrips();
      if (!mounted) return;
      setTrips(data);
      setLoading(false);
    };

    void fetchTrips();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (view === "detail" || view === "add" || view === "edit") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [view, selectedTrip?.id]);

  const filteredTrips = useMemo(() => {
    if (!search) return trips;
    const query = search.toLowerCase();
    return trips.filter((trip) => (
      getLocalizedTripTitle(trip, language).toLowerCase().includes(query)
      || getLocalizedTripDestination(trip.destination, language).toLowerCase().includes(query)
      || trip.title.toLowerCase().includes(query)
      || trip.destination.toLowerCase().includes(query)
      || trip.tags.some((tag) => tag.toLowerCase().includes(query))
    ));
  }, [trips, search, language]);

  const { totalTrips, totalDestinations, totalSpent } = useMemo(() => ({
    totalTrips: getTripsOutsidePortugalCount(trips),
    totalDestinations: getTripDestinationCount(trips),
    totalSpent: trips.reduce((sum, trip) => sum + getTripTotal(trip), 0),
  }), [trips]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(t("trips.confirmDelete"));
    if (!confirmed) return;

    try {
      await deleteTrip(id);
      setTrips((prev) => prev.filter((trip) => trip.id !== id));
      setView("dashboard");
      setSelectedTrip(null);
    } catch (error) {
      console.error("Error deleting trip:", error);
      alert(t("trips.deleteError"));
    }
  };

  const handleEdit = (trip: Trip) => {
    setSelectedTrip(trip);
    setView("edit");
  };

  const handleSaveNew = async (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">) => {
    try {
      const created = await createTrip(trip);
      setTrips((prev) => [created, ...prev]);
      setView("dashboard");
    } catch (error) {
      console.error("Error creating trip:", error);
      alert(t("trips.createError"));
    }
  };

  const handleSaveEdit = async (data: Omit<Trip, "id" | "createdAt" | "updatedAt">) => {
    if (!selectedTrip) return;

    try {
      const changes = buildTripChanges(selectedTrip, data);
      if (Object.keys(changes).length === 0) {
        setView("detail");
        return;
      }

      const { updatedAt } = await updateTrip(selectedTrip.id, changes);
      const updated: Trip = {
        ...selectedTrip,
        ...changes,
        updatedAt,
      };

      setTrips((prev) => prev.map((trip) => (trip.id === updated.id ? updated : trip)));
      setSelectedTrip(updated);
      setView("detail");
    } catch (error) {
      console.error("Error updating trip:", error);
      alert(t("trips.saveError"));
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center text-muted-foreground">{t("trips.loadingTrips")}</main>
      </>
    );
  }

  if (view === "detail" && selectedTrip) {
    const current = trips.find((trip) => trip.id === selectedTrip.id);
    if (!current) {
      setView("dashboard");
      return null;
    }

    return (
      <>
        <Header />
        <TripDetail
          trip={current}
          onBack={() => {
            setView("dashboard");
            setSelectedTrip(null);
          }}
          onDelete={(id) => {
            void handleDelete(id);
          }}
          onEdit={() => handleEdit(current)}
        />
      </>
    );
  }

  if (view === "add") {
    return <TripForm onSave={(trip) => { void handleSaveNew(trip); }} onCancel={() => setView("dashboard")} />;
  }

  if (view === "edit" && selectedTrip) {
    const current = trips.find((trip) => trip.id === selectedTrip.id);
    if (!current) {
      setView("dashboard");
      return null;
    }

    return <TripForm trip={current} onSave={(trip) => { void handleSaveEdit(trip); }} onCancel={() => setView("detail")} />;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,hsl(var(--accent)/0.18),transparent_40%),radial-gradient(circle_at_85%_20%,hsl(var(--primary)/0.14),transparent_42%),linear-gradient(110deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.32)_45%,hsl(var(--background))_100%)]" />

          <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12 relative">
            <div className="grid gap-6 sm:gap-8">
              <motion.div
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65 }}
                className="w-full"
              >
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[0.98]">
                  {t("trips.pageTitle")}
                </h1>

                <p className="mt-4 text-muted-foreground font-body text-base sm:text-lg leading-relaxed">
                  {t("trips.pageSubtitle")}
                </p>
              </motion.div>

              {totalTrips > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(150deg,hsl(var(--background)/0.92),hsl(var(--secondary)/0.46))] px-4 py-3 backdrop-blur-sm shadow-[0_12px_26px_hsl(var(--foreground)/0.08)]">
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                    <p className="font-display text-3xl font-semibold tracking-tight text-foreground">{totalTrips}</p>
                    <p className="mt-0.5 text-xs font-body uppercase tracking-[0.16em] text-foreground/65">{t("trips.stats.trips")}</p>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(150deg,hsl(var(--background)/0.92),hsl(var(--secondary)/0.46))] px-4 py-3 backdrop-blur-sm shadow-[0_12px_26px_hsl(var(--foreground)/0.08)]">
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                    <p className="font-display text-3xl font-semibold tracking-tight text-foreground">{totalDestinations}</p>
                    <p className="mt-0.5 text-xs font-body uppercase tracking-[0.16em] text-foreground/65">{t("trips.stats.destinations")}</p>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(150deg,hsl(var(--background)/0.92),hsl(var(--secondary)/0.46))] px-4 py-3 backdrop-blur-sm shadow-[0_12px_26px_hsl(var(--foreground)/0.08)]">
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                    <p className="font-display text-3xl font-semibold tracking-tight text-foreground">{formatCurrency(totalSpent, "EUR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    <p className="mt-0.5 text-xs font-body uppercase tracking-[0.12em] text-foreground/65">{t("trips.stats.invested")}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 sm:px-6 pb-20">
          {filteredTrips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.55 }}
              className="mb-4 sm:mb-5"
            >
              <TripsWorldMap
                trips={filteredTrips}
                onSelectTrip={(trip) => {
                  setSelectedTrip(trip);
                  setView("detail");
                }}
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8"
          >
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("trips.searchPlaceholder")}
                className="pl-11 h-11 rounded-full bg-secondary/50 border-border/50 font-body"
              />
            </div>
            <Button
              onClick={() => setView("add")}
              className="gap-2 rounded-full px-6 h-11 bg-foreground text-background hover:bg-foreground/90 font-body shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="h-4 w-4" />
              {t("trips.newTrip")}
            </Button>
          </motion.div>

          <AnimatePresence mode="popLayout">
            {filteredTrips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredTrips.map((trip, index) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    index={index}
                    prioritizeImage={index < 2}
                    onClick={() => {
                      setSelectedTrip(trip);
                      setView("detail");
                    }}
                  />
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
                <Compass className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-display text-2xl text-muted-foreground mb-2">
                  {search ? t("trips.noTripsFound") : t("trips.noTripsYet")}
                </p>
                <p className="text-sm text-muted-foreground font-body mb-6">
                  {search ? t("trips.tryAnotherSearch") : t("trips.addFirstAdventure")}
                </p>
                {!search && (
                  <Button onClick={() => setView("add")} className="rounded-full px-6 bg-foreground text-background hover:bg-foreground/90 font-body gap-2">
                    <Plus className="h-4 w-4" />{t("trips.newTrip")}
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </>
  );
}
