import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FlightLeg, Trip, TripExpense, TripFood, TripHotel, TripTicket } from "@/features/trips/types/trip";

interface TripFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: Trip | null;
  onSave: (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">) => void;
}

const emptyFlight = (): FlightLeg => ({ from: "", to: "", departure: "", arrival: "", carrier: "", flightNumber: "" });
const emptyHotel = (): TripHotel => ({ name: "", address: "", checkIn: "", checkOut: "", cost: 0, phone: "", confirmationNumber: "", link: "" });
const emptyFood = (): TripFood => ({ name: "", description: "" });
const emptyTicket = (): TripTicket => ({ name: "", venue: "", address: "", seats: "", cost: 0 });
const emptyExpense = (): TripExpense => ({ label: "", amount: 0 });

export function TripFormDialog({ open, onOpenChange, trip, onSave }: TripFormDialogProps) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cost, setCost] = useState("0");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [photosText, setPhotosText] = useState("");

  const [outbound, setOutbound] = useState<FlightLeg[]>([]);
  const [returnFlights, setReturnFlights] = useState<FlightLeg[]>([]);
  const [travelCost, setTravelCost] = useState("");
  const [hotels, setHotels] = useState<TripHotel[]>([]);
  const [foods, setFoods] = useState<TripFood[]>([]);
  const [tickets, setTickets] = useState<TripTicket[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);

  useEffect(() => {
    if (!open) return;

    if (trip) {
      setTitle(trip.title);
      setDestination(trip.destination);
      setStartDate(trip.startDate);
      setEndDate(trip.endDate);
      setCost(String(trip.cost));
      setTags(trip.tags.join(", "));
      setNotes(trip.notes);
      setPhotosText(trip.photos.join("\n"));

      setOutbound(trip.travel?.outbound ?? []);
      setReturnFlights(trip.travel?.returnTrip ?? []);
      setTravelCost(trip.travel?.cost != null ? String(trip.travel.cost) : "");
      setHotels(trip.hotels ?? []);
      setFoods(trip.foods ?? []);
      setTickets(trip.tickets ?? []);
      setExpenses(trip.expenses ?? []);
      return;
    }

    setTitle("");
    setDestination("");
    setStartDate("");
    setEndDate("");
    setCost("0");
    setTags("");
    setNotes("");
    setPhotosText("");

    setOutbound([]);
    setReturnFlights([]);
    setTravelCost("");
    setHotels([]);
    setFoods([]);
    setTickets([]);
    setExpenses([]);
  }, [trip, open]);

  const updateArray = <T,>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
    field: keyof T,
    value: unknown,
  ) => {
    setter((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeFromArray = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !destination.trim() || !startDate || !endDate) {
      return;
    }

    const photos = photosText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const normalizedExpenses = expenses
      .map((item) => ({ label: item.label.trim(), amount: Number(item.amount) || 0 }))
      .filter((item) => item.label);

    const totalCost = normalizedExpenses.length
      ? normalizedExpenses.reduce((sum, item) => sum + item.amount, 0)
      : Number(cost) || 0;

    onSave({
      title: title.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      cost: totalCost,
      photos,
      hotels: hotels.map((item) => ({
        ...item,
        name: item.name.trim(),
        address: item.address?.trim(),
        phone: item.phone?.trim(),
        confirmationNumber: item.confirmationNumber?.trim(),
        link: item.link?.trim(),
      })).filter((item) => item.name),
      foods: foods.map((item) => ({
        ...item,
        name: item.name.trim(),
        description: item.description?.trim(),
      })).filter((item) => item.name),
      notes: notes.trim(),
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      travel: outbound.length || returnFlights.length
        ? {
          outbound: outbound.filter((item) => item.from.trim() && item.to.trim()),
          returnTrip: returnFlights.filter((item) => item.from.trim() && item.to.trim()),
          cost: travelCost ? Number(travelCost) || 0 : undefined,
        }
        : undefined,
      tickets: tickets.map((item) => ({
        ...item,
        name: item.name.trim(),
        venue: item.venue?.trim(),
        address: item.address?.trim(),
        seats: item.seats?.trim(),
        cost: item.cost != null ? Number(item.cost) || 0 : undefined,
      })).filter((item) => item.name),
      expenses: normalizedExpenses,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto p-4 sm:max-w-4xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{trip ? "Edit trip" : "New trip"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <p className="text-sm font-semibold">General</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="trip-title">Title</Label>
                <Input id="trip-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="trip-destination">Destination</Label>
                <Input id="trip-destination" value={destination} onChange={(e) => setDestination(e.target.value)} required />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="trip-start">Start date</Label>
                <Input id="trip-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="trip-end">End date</Label>
                <Input id="trip-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="trip-cost">Estimated cost (EUR)</Label>
                <Input id="trip-cost" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="trip-tags">Tags (comma separated)</Label>
              <Input id="trip-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="adventure, family" />
            </div>

            <div>
              <Label htmlFor="trip-notes">Notes</Label>
              <Textarea id="trip-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            <div>
              <Label htmlFor="trip-photos">Photo URLs (one per line)</Label>
              <Textarea id="trip-photos" value={photosText} onChange={(e) => setPhotosText(e.target.value)} rows={3} />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Flights - outbound</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setOutbound((prev) => [...prev, emptyFlight()])}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {outbound.map((leg, index) => (
              <div key={`out-${index}`} className="relative grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-4">
                <Input placeholder="From" value={leg.from} onChange={(e) => updateArray(setOutbound, index, "from", e.target.value)} />
                <Input placeholder="To" value={leg.to} onChange={(e) => updateArray(setOutbound, index, "to", e.target.value)} />
                <Input placeholder="Departure" value={leg.departure} onChange={(e) => updateArray(setOutbound, index, "departure", e.target.value)} />
                <Input placeholder="Arrival" value={leg.arrival} onChange={(e) => updateArray(setOutbound, index, "arrival", e.target.value)} />
                <Input placeholder="Carrier" value={leg.carrier || ""} onChange={(e) => updateArray(setOutbound, index, "carrier", e.target.value)} />
                <Input placeholder="Flight #" value={leg.flightNumber || ""} onChange={(e) => updateArray(setOutbound, index, "flightNumber", e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" onClick={() => removeFromArray(setOutbound, index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm font-semibold">Flights - return</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setReturnFlights((prev) => [...prev, emptyFlight()])}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {returnFlights.map((leg, index) => (
              <div key={`ret-${index}`} className="relative grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-4">
                <Input placeholder="From" value={leg.from} onChange={(e) => updateArray(setReturnFlights, index, "from", e.target.value)} />
                <Input placeholder="To" value={leg.to} onChange={(e) => updateArray(setReturnFlights, index, "to", e.target.value)} />
                <Input placeholder="Departure" value={leg.departure} onChange={(e) => updateArray(setReturnFlights, index, "departure", e.target.value)} />
                <Input placeholder="Arrival" value={leg.arrival} onChange={(e) => updateArray(setReturnFlights, index, "arrival", e.target.value)} />
                <Input placeholder="Carrier" value={leg.carrier || ""} onChange={(e) => updateArray(setReturnFlights, index, "carrier", e.target.value)} />
                <Input placeholder="Flight #" value={leg.flightNumber || ""} onChange={(e) => updateArray(setReturnFlights, index, "flightNumber", e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" onClick={() => removeFromArray(setReturnFlights, index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="max-w-xs">
              <Label htmlFor="travel-cost">Flights cost (EUR)</Label>
              <Input id="travel-cost" type="number" step="0.01" value={travelCost} onChange={(e) => setTravelCost(e.target.value)} />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Hotels</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setHotels((prev) => [...prev, emptyHotel()])}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {hotels.map((hotel, index) => (
              <div key={`hotel-${index}`} className="relative grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                <Input placeholder="Name" value={hotel.name} onChange={(e) => updateArray(setHotels, index, "name", e.target.value)} />
                <Input placeholder="Address" value={hotel.address || ""} onChange={(e) => updateArray(setHotels, index, "address", e.target.value)} />
                <Input type="date" value={hotel.checkIn || ""} onChange={(e) => updateArray(setHotels, index, "checkIn", e.target.value)} />
                <Input type="date" value={hotel.checkOut || ""} onChange={(e) => updateArray(setHotels, index, "checkOut", e.target.value)} />
                <Input placeholder="Cost" type="number" step="0.01" value={hotel.cost || 0} onChange={(e) => updateArray(setHotels, index, "cost", Number(e.target.value) || 0)} />
                <Input placeholder="Phone" value={hotel.phone || ""} onChange={(e) => updateArray(setHotels, index, "phone", e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" onClick={() => removeFromArray(setHotels, index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Tickets</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setTickets((prev) => [...prev, emptyTicket()])}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {tickets.map((ticket, index) => (
              <div key={`ticket-${index}`} className="relative grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                <Input placeholder="Name" value={ticket.name} onChange={(e) => updateArray(setTickets, index, "name", e.target.value)} />
                <Input placeholder="Venue" value={ticket.venue || ""} onChange={(e) => updateArray(setTickets, index, "venue", e.target.value)} />
                <Input placeholder="Seats" value={ticket.seats || ""} onChange={(e) => updateArray(setTickets, index, "seats", e.target.value)} />
                <Input placeholder="Cost" type="number" step="0.01" value={ticket.cost || 0} onChange={(e) => updateArray(setTickets, index, "cost", Number(e.target.value) || 0)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" onClick={() => removeFromArray(setTickets, index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Food highlights</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setFoods((prev) => [...prev, emptyFood()])}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {foods.map((food, index) => (
              <div key={`food-${index}`} className="relative grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                <Input placeholder="Name" value={food.name} onChange={(e) => updateArray(setFoods, index, "name", e.target.value)} />
                <Input placeholder="Description" value={food.description || ""} onChange={(e) => updateArray(setFoods, index, "description", e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" onClick={() => removeFromArray(setFoods, index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Expenses</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setExpenses((prev) => [...prev, emptyExpense()])}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {expenses.map((expense, index) => (
              <div key={`expense-${index}`} className="relative grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                <Input placeholder="Label" value={expense.label} onChange={(e) => updateArray(setExpenses, index, "label", e.target.value)} />
                <Input placeholder="Amount" type="number" step="0.01" value={expense.amount || 0} onChange={(e) => updateArray(setExpenses, index, "amount", Number(e.target.value) || 0)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" onClick={() => removeFromArray(setExpenses, index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </section>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {trip ? "Save changes" : "Create trip"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
