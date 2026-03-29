import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Upload, X, Plane, Hotel, UtensilsCrossed, Ticket, Receipt } from "lucide-react";
import { FlightLeg, Trip, TripExpense, TripFood, TripHotel, TripTicket } from "@/features/trips/types/trip";
import { Header } from "@/features/trips/components/Header";
import { supabase } from "@/lib/supabase";

interface TripFormProps {
  trip?: Trip;
  onSave: (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 0.78;
const STORAGE_BUCKET = "trip-photos";

const readAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result ?? ""));
  reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem."));
  reader.readAsDataURL(file);
});

const loadImageElement = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("Nao foi possivel processar a imagem."));
  image.src = src;
});

const compressFileToBlob = async (file: File): Promise<Blob> => {
  const dataUrl = await readAsDataUrl(file);
  const image = await loadImageElement(dataUrl);
  const { naturalWidth: w, naturalHeight: h } = image;
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      IMAGE_QUALITY,
    );
  });
};

const emptyFlight = (): FlightLeg => ({ from: "", to: "", departure: "", arrival: "", carrier: "", flightNumber: "" });
const emptyHotel = (): TripHotel => ({ name: "", address: "", checkIn: "", checkOut: "", cost: 0, phone: "", confirmationNumber: "" });
const emptyFood = (): TripFood => ({ name: "", description: "" });
const emptyTicket = (): TripTicket => ({ name: "", venue: "", address: "", seats: "", cost: 0 });
const emptyExpense = (): TripExpense => ({ label: "", amount: 0 });

const SectionHeader = ({
  icon: Icon,
  title,
  onAdd,
  addLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onAdd: () => void;
  addLabel: string;
}) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-accent" />
      <h3 className="font-display text-lg font-semibold">{title}</h3>
    </div>
    <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="gap-1 text-accent hover:text-accent font-body text-xs rounded-full">
      <Plus className="h-3 w-3" />{addLabel}
    </Button>
  </div>
);

const RemoveBtn = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="absolute -top-2 -right-2 p-1 bg-destructive rounded-full shadow-sm hover:bg-destructive/80 transition-colors z-10">
    <X className="h-3 w-3 text-destructive-foreground" />
  </button>
);

export function TripForm({ trip, onSave, onCancel }: TripFormProps) {
  const [title, setTitle] = useState(trip?.title || "");
  const [destination, setDestination] = useState(trip?.destination || "");
  const [startDate, setStartDate] = useState(trip?.startDate || "");
  const [endDate, setEndDate] = useState(trip?.endDate || "");
  const [notes, setNotes] = useState(trip?.notes || "");
  const [tags, setTags] = useState(trip?.tags.join(", ") || "");
  const [photos, setPhotos] = useState<string[]>(trip?.photos || []);
  const [isUploading, setIsUploading] = useState(false);

  const [outbound, setOutbound] = useState<FlightLeg[]>(trip?.travel?.outbound || []);
  const [returnFlights, setReturnFlights] = useState<FlightLeg[]>(trip?.travel?.returnTrip || []);
  const [travelCost, setTravelCost] = useState(trip?.travel?.cost?.toString() || "");

  const [hotels, setHotels] = useState<TripHotel[]>(trip?.hotels || []);
  const [foods, setFoods] = useState<TripFood[]>(trip?.foods || []);
  const [tickets, setTickets] = useState<TripTicket[]>(trip?.tickets || []);
  const [expenses, setExpenses] = useState<TripExpense[]>(trip?.expenses || []);

  useEffect(() => {
    setTitle(trip?.title || "");
    setDestination(trip?.destination || "");
    setStartDate(trip?.startDate || "");
    setEndDate(trip?.endDate || "");
    setNotes(trip?.notes || "");
    setTags(trip?.tags.join(", ") || "");
    setPhotos(trip?.photos || []);

    setOutbound(trip?.travel?.outbound || []);
    setReturnFlights(trip?.travel?.returnTrip || []);
    setTravelCost(trip?.travel?.cost?.toString() || "");

    setHotels(trip?.hotels || []);
    setFoods(trip?.foods || []);
    setTickets(trip?.tickets || []);
    setExpenses(trip?.expenses || []);
  }, [trip]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map(async (file) => {
          const blob = await compressFileToBlob(file);
          const fileName = `${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, blob, { contentType: "image/jpeg" });
          if (error) throw new Error(`Upload falhou: ${error.message}`);
          return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName).data.publicUrl;
        }),
      );
      setPhotos((prev) => [...prev, ...urls]);
    } catch (error) {
      console.error("Error uploading photos:", error);
      alert("Nao foi possivel fazer upload das fotos. Tenta novamente.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const updateArray = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, field: keyof T, value: unknown) => {
    setter((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeFromArray = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title || !destination || !startDate || !endDate) return;

    const totalCost = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);

    onSave({
      title,
      destination,
      startDate,
      endDate,
      cost: totalCost || 0,
      photos,
      hotels,
      foods: foods.filter((food) => food.name),
      notes,
      tags: tags ? tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
      travel: outbound.length > 0 || returnFlights.length > 0
        ? {
          outbound: outbound.filter((item) => item.from && item.to),
          returnTrip: returnFlights.filter((item) => item.from && item.to),
          cost: parseFloat(travelCost) || undefined,
        }
        : undefined,
      tickets: tickets.filter((ticket) => ticket.name),
      expenses: expenses.filter((expense) => expense.label),
    });
  };

  return (
    <>
      <Header />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <Button variant="ghost" onClick={onCancel} className="gap-2 font-body text-muted-foreground hover:text-foreground rounded-full mb-4">
            <ArrowLeft className="h-4 w-4" />Voltar
          </Button>

          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-8">
            {trip ? "Editar Viagem" : "Nova Aventura"}
          </h1>

          <form onSubmit={handleSubmit} className="max-w-3xl space-y-10 pb-20">
            <section className="space-y-4">
              <h3 className="font-display text-lg font-semibold border-b border-border pb-2">Informacao Geral</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body text-sm font-medium">Titulo</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="CrossFit Games 2024" required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm font-medium">Destino</Label>
                  <Input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Madison, Wisconsin" required className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-body text-sm font-medium">Data Inicio</Label>
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm font-medium">Data Fim</Label>
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required className="rounded-xl" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label className="font-body text-sm font-medium">Tags</Label>
                  <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="aventura, fitness" className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm font-medium">Notas / Historia</Label>
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Escreve sobre as vossas memorias favoritas..." rows={3} className="rounded-xl resize-none" />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-display text-lg font-semibold border-b border-border pb-2">Fotos</h3>
              <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-accent/50 hover:bg-secondary/50 transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-body">{isUploading ? "A carregar fotos..." : "Clica para carregar fotos"}</span>
                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={isUploading} />
              </label>
              {photos.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {photos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="relative aspect-square rounded-lg overflow-hidden group/photo">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== index))} className="absolute top-1 right-1 p-0.5 bg-foreground/70 rounded-full opacity-0 group-hover/photo:opacity-100 transition-opacity">
                        <X className="h-3 w-3 text-background" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Plane className="h-4 w-4 text-accent" />
                <h3 className="font-display text-lg font-semibold">Voos</h3>
              </div>

              <div className="space-y-3">
                <SectionHeader icon={Plane} title="Ida" onAdd={() => setOutbound((prev) => [...prev, emptyFlight()])} addLabel="Voo" />
                {outbound.map((leg, index) => (
                  <div key={`out-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                    <RemoveBtn onClick={() => removeFromArray(setOutbound, index)} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input placeholder="De" value={leg.from} onChange={(event) => updateArray(setOutbound, index, "from", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder="Para" value={leg.to} onChange={(event) => updateArray(setOutbound, index, "to", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder="Partida" value={leg.departure} onChange={(event) => updateArray(setOutbound, index, "departure", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder="Chegada" value={leg.arrival} onChange={(event) => updateArray(setOutbound, index, "arrival", event.target.value)} className="rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Companhia" value={leg.carrier || ""} onChange={(event) => updateArray(setOutbound, index, "carrier", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder="No Voo" value={leg.flightNumber || ""} onChange={(event) => updateArray(setOutbound, index, "flightNumber", event.target.value)} className="rounded-lg text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <SectionHeader icon={Plane} title="Volta" onAdd={() => setReturnFlights((prev) => [...prev, emptyFlight()])} addLabel="Voo" />
                {returnFlights.map((leg, index) => (
                  <div key={`ret-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                    <RemoveBtn onClick={() => removeFromArray(setReturnFlights, index)} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input placeholder="De" value={leg.from} onChange={(event) => updateArray(setReturnFlights, index, "from", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder="Para" value={leg.to} onChange={(event) => updateArray(setReturnFlights, index, "to", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder="Partida" value={leg.departure} onChange={(event) => updateArray(setReturnFlights, index, "departure", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder="Chegada" value={leg.arrival} onChange={(event) => updateArray(setReturnFlights, index, "arrival", event.target.value)} className="rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Companhia" value={leg.carrier || ""} onChange={(event) => updateArray(setReturnFlights, index, "carrier", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder="No Voo" value={leg.flightNumber || ""} onChange={(event) => updateArray(setReturnFlights, index, "flightNumber", event.target.value)} className="rounded-lg text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="max-w-xs space-y-2">
                <Label className="font-body text-sm font-medium">Custo total voos (EUR)</Label>
                <Input type="number" step="0.01" value={travelCost} onChange={(event) => setTravelCost(event.target.value)} placeholder="2827.70" className="rounded-xl" />
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeader icon={Ticket} title="Bilhetes / Eventos" onAdd={() => setTickets((prev) => [...prev, emptyTicket()])} addLabel="Bilhete" />
              {tickets.map((ticket, index) => (
                <div key={`ticket-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                  <RemoveBtn onClick={() => removeFromArray(setTickets, index)} />
                  <Input placeholder="Nome do evento" value={ticket.name} onChange={(event) => updateArray(setTickets, index, "name", event.target.value)} className="rounded-lg text-sm" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Local / Venue" value={ticket.venue || ""} onChange={(event) => updateArray(setTickets, index, "venue", event.target.value)} className="rounded-lg text-sm" />
                    <Input placeholder="Morada" value={ticket.address || ""} onChange={(event) => updateArray(setTickets, index, "address", event.target.value)} className="rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Lugares" value={ticket.seats || ""} onChange={(event) => updateArray(setTickets, index, "seats", event.target.value)} className="rounded-lg text-sm" />
                    <Input type="number" step="0.01" placeholder="Custo (EUR)" value={ticket.cost || ""} onChange={(event) => updateArray(setTickets, index, "cost", parseFloat(event.target.value) || 0)} className="rounded-lg text-sm" />
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <SectionHeader icon={Hotel} title="Hoteis / Alojamento" onAdd={() => setHotels((prev) => [...prev, emptyHotel()])} addLabel="Hotel" />
              {hotels.map((hotel, index) => (
                <div key={`hotel-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                  <RemoveBtn onClick={() => removeFromArray(setHotels, index)} />
                  <Input placeholder="Nome do hotel" value={hotel.name} onChange={(event) => updateArray(setHotels, index, "name", event.target.value)} className="rounded-lg text-sm" />
                  <Input placeholder="Morada" value={hotel.address || ""} onChange={(event) => updateArray(setHotels, index, "address", event.target.value)} className="rounded-lg text-sm" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Input type="date" value={hotel.checkIn || ""} onChange={(event) => updateArray(setHotels, index, "checkIn", event.target.value)} className="rounded-lg text-sm" />
                    <Input type="date" value={hotel.checkOut || ""} onChange={(event) => updateArray(setHotels, index, "checkOut", event.target.value)} className="rounded-lg text-sm" />
                    <Input type="number" step="0.01" placeholder="Custo (EUR)" value={hotel.cost || ""} onChange={(event) => updateArray(setHotels, index, "cost", parseFloat(event.target.value) || 0)} className="rounded-lg text-sm" />
                    <Input placeholder="Telefone" value={hotel.phone || ""} onChange={(event) => updateArray(setHotels, index, "phone", event.target.value)} className="rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="No Confirmacao" value={hotel.confirmationNumber || ""} onChange={(event) => updateArray(setHotels, index, "confirmationNumber", event.target.value)} className="rounded-lg text-sm" />
                    <Input placeholder="Website (link)" value={hotel.link || ""} onChange={(event) => updateArray(setHotels, index, "link", event.target.value)} className="rounded-lg text-sm" />
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <SectionHeader icon={UtensilsCrossed} title="Comidas" onAdd={() => setFoods((prev) => [...prev, emptyFood()])} addLabel="Comida" />
              {foods.map((food, index) => (
                <div key={`food-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                  <RemoveBtn onClick={() => removeFromArray(setFoods, index)} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Nome do prato" value={food.name} onChange={(event) => updateArray(setFoods, index, "name", event.target.value)} className="rounded-lg text-sm" />
                    <Input placeholder="Descricao" value={food.description || ""} onChange={(event) => updateArray(setFoods, index, "description", event.target.value)} className="rounded-lg text-sm" />
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <SectionHeader icon={Receipt} title="Despesas" onAdd={() => setExpenses((prev) => [...prev, emptyExpense()])} addLabel="Despesa" />
              {expenses.map((expense, index) => (
                <div key={`expense-${index}`} className="relative bg-secondary/30 rounded-xl p-3 border border-border/40">
                  <RemoveBtn onClick={() => removeFromArray(setExpenses, index)} />
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder="Descricao" value={expense.label} onChange={(event) => updateArray(setExpenses, index, "label", event.target.value)} className="rounded-lg text-sm col-span-2" />
                    <Input type="number" step="0.01" placeholder="EUR" value={expense.amount || ""} onChange={(event) => updateArray(setExpenses, index, "amount", parseFloat(event.target.value) || 0)} className="rounded-lg text-sm" />
                  </div>
                </div>
              ))}
              {expenses.length > 0 && (
                <p className="text-sm font-body text-right text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">EUR {expenses.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</span>
                </p>
              )}
            </section>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl font-body flex-1 sm:flex-none sm:px-8">
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading} className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-body flex-1 sm:flex-none sm:px-8 h-11">
                {trip ? "Guardar Alteracoes" : "Criar Viagem"}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}
