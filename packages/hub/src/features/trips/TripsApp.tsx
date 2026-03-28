import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, Heart, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/features/trips/components/Header";
import { TripCard } from "@/features/trips/components/TripCard";
import { TripDetail } from "@/features/trips/components/TripDetail";
import { TripForm } from "@/features/trips/components/TripForm";
import { createTrip, deleteTrip, loadTrips, updateTrip } from "@/lib/trips";
import { Trip } from "@/features/trips/types/trip";
import { useEffect } from "react";

type View = "dashboard" | "detail" | "add" | "edit";

export function TripsApp() {
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

  const filteredTrips = useMemo(() => {
    if (!search) return trips;
    const query = search.toLowerCase();
    return trips.filter((trip) => (
      trip.title.toLowerCase().includes(query)
      || trip.destination.toLowerCase().includes(query)
      || trip.tags.some((tag) => tag.toLowerCase().includes(query))
    ));
  }, [trips, search]);

  const totalTrips = trips.length;
  const totalCountries = new Set(trips.map((trip) => trip.destination)).size;
  const totalSpent = trips.reduce((sum, trip) => sum + trip.cost, 0);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Apagar esta viagem?");
    if (!confirmed) return;

    try {
      await deleteTrip(id);
      setTrips((prev) => prev.filter((trip) => trip.id !== id));
      setView("dashboard");
      setSelectedTrip(null);
    } catch (error) {
      console.error("Error deleting trip:", error);
      alert("Nao foi possivel apagar a viagem.");
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
      alert("Nao foi possivel criar a viagem.");
    }
  };

  const handleSaveEdit = async (data: Omit<Trip, "id" | "createdAt" | "updatedAt">) => {
    if (!selectedTrip) return;

    try {
      const updated = await updateTrip({
        ...selectedTrip,
        ...data,
      });

      setTrips((prev) => prev.map((trip) => (trip.id === updated.id ? updated : trip)));
      setSelectedTrip(updated);
      setView("detail");
    } catch (error) {
      console.error("Error updating trip:", error);
      alert("Nao foi possivel guardar as alteracoes.");
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center text-muted-foreground">A carregar viagens...</main>
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
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-secondary/30" />
          <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-accent fill-accent" />
                <span className="text-sm font-body font-medium text-accent uppercase tracking-widest">O nosso diario</span>
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-4 leading-[1.05]">
                As Nossas<br />
                <span className="italic font-normal">Aventuras</span>
              </h1>
              <p className="text-muted-foreground font-body text-lg sm:text-xl max-w-lg leading-relaxed">
                Cada viagem conta uma historia. Aqui guardamos as nossas memorias, juntos.
              </p>
            </motion.div>

            {totalTrips > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex flex-wrap gap-8 mt-10"
              >
                <div>
                  <p className="font-display text-3xl sm:text-4xl font-bold text-foreground">{totalTrips}</p>
                  <p className="text-sm text-muted-foreground font-body">viagens</p>
                </div>
                <div>
                  <p className="font-display text-3xl sm:text-4xl font-bold text-foreground">{totalCountries}</p>
                  <p className="text-sm text-muted-foreground font-body">destinos</p>
                </div>
                <div>
                  <p className="font-display text-3xl sm:text-4xl font-bold text-foreground">EUR {totalSpent.toLocaleString("pt-PT", { minimumFractionDigits: 0 })}</p>
                  <p className="text-sm text-muted-foreground font-body">investidos em memorias</p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        <section className="container mx-auto px-4 sm:px-6 pb-20">
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
                placeholder="Pesquisar viagens..."
                className="pl-11 h-11 rounded-full bg-secondary/50 border-border/50 font-body"
              />
            </div>
            <Button
              onClick={() => setView("add")}
              className="gap-2 rounded-full px-6 h-11 bg-foreground text-background hover:bg-foreground/90 font-body shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="h-4 w-4" />
              Nova Viagem
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
                  {search ? "Nenhuma viagem encontrada" : "Ainda sem viagens"}
                </p>
                <p className="text-sm text-muted-foreground font-body mb-6">
                  {search ? "Tenta outra pesquisa." : "Comeca por adicionar a vossa primeira aventura juntos."}
                </p>
                {!search && (
                  <Button onClick={() => setView("add")} className="rounded-full px-6 bg-foreground text-background hover:bg-foreground/90 font-body gap-2">
                    <Plus className="h-4 w-4" />Nova Viagem
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
