import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Hotel, UtensilsCrossed, StickyNote, Trash2, Plane, Ticket, Receipt, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trip } from "@/features/trips/types/trip";
import { optimizeTripPhotoUrl } from "@/features/trips/utils/photo-url";

interface TripDetailProps {
  trip: Trip;
  onBack: () => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

const Section = ({
  icon: Icon,
  title,
  delay,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  delay: number;
  children: React.ReactNode;
}) => (
  <motion.section initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay }}>
    <div className="flex items-center gap-2 mb-4">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-foreground/85">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
    </div>
    {children}
  </motion.section>
);

const InfoCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border/70 bg-secondary/65 p-5 shadow-sm ${className}`}>{children}</div>
);

const firstSentence = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1].trim() : trimmed;
};

export function TripDetail({ trip, onBack, onDelete, onEdit }: TripDetailProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const totalFromExpenses = trip.expenses?.reduce((sum, item) => sum + item.amount, 0);
  const formatEuro = (value: number) => `${value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} className="gap-2 font-body text-muted-foreground hover:text-foreground rounded-full">
              <ArrowLeft className="h-4 w-4" />Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onEdit} className="gap-2 font-body text-muted-foreground hover:text-foreground rounded-full">
                <Pencil className="h-4 w-4" />Editar
              </Button>
              <Button variant="ghost" onClick={() => onDelete(trip.id)} className="gap-2 font-body text-destructive hover:text-destructive rounded-full">
                <Trash2 className="h-4 w-4" />Apagar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pt-4 pb-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-3">{trip.title}</h1>
          <div className="flex flex-wrap items-center gap-2.5 font-body">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-3 py-1.5 text-foreground/75">
              <MapPin className="h-4 w-4" />{trip.destination}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-3 py-1.5 text-foreground/75">
              <Calendar className="h-4 w-4" />
              {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground text-background px-3 py-1.5 font-semibold shadow-sm">
              {formatEuro(totalFromExpenses || trip.cost)}
            </span>
          </div>
          {trip.tags.length > 0 && (
            <div className="flex gap-2 mt-3">
              {trip.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="rounded-full bg-secondary/70 font-body font-normal text-foreground/80">{tag}</Badge>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {trip.photos.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {trip.photos.map((photo, index) => (
              <motion.div
                key={`${photo}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className={`overflow-hidden rounded-xl cursor-pointer ${index === 0 ? "col-span-2 row-span-2" : ""}`}
                onClick={() => setSelectedPhoto(index)}
              >
                <img src={optimizeTripPhotoUrl(photo, { width: index === 0 ? 1200 : 700, quality: 70 })} alt={`${trip.title} photo ${index + 1}`} className="w-full h-full object-cover aspect-square hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {selectedPhoto !== null && (
        <div className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={optimizeTripPhotoUrl(trip.photos[selectedPhoto], { width: 1800, quality: 78 })}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            decoding="async"
          />
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 pb-20">
        <div className="max-w-3xl mx-auto space-y-12">
          {trip.notes && (
            <Section icon={StickyNote} title="A Nossa Historia" delay={0.25}>
              <p className="font-body text-base leading-relaxed text-foreground/80 sm:text-lg">{trip.notes}</p>
            </Section>
          )}

          {trip.travel && (
            <Section icon={Plane} title="Viagem" delay={0.3}>
              <div className="space-y-4">
                <InfoCard>
                  <p className="mb-3 text-xs font-body font-semibold uppercase tracking-wider text-foreground/75">Ida - {format(new Date(trip.startDate), "d MMM yyyy")}</p>
                  <div className="space-y-2">
                    {trip.travel.outbound.map((leg, index) => (
                      <div key={`out-${index}`} className="flex items-center gap-3 text-sm font-body">
                        <span className="min-w-[60px] font-semibold text-foreground/80">{leg.departure}</span>
                        <span className="text-foreground">{leg.from}</span>
                        <span className="text-foreground/70">-&gt;</span>
                        <span className="text-foreground">{leg.to}</span>
                        <span className="ml-auto hidden text-xs text-foreground/80 sm:block">{leg.carrier}</span>
                      </div>
                    ))}
                  </div>
                </InfoCard>
                <InfoCard>
                  <p className="mb-3 text-xs font-body font-semibold uppercase tracking-wider text-foreground/75">Volta - {format(new Date(trip.endDate), "d MMM yyyy")}</p>
                  <div className="space-y-2">
                    {trip.travel.returnTrip.map((leg, index) => (
                      <div key={`ret-${index}`} className="flex items-center gap-3 text-sm font-body">
                        <span className="min-w-[60px] font-semibold text-foreground/80">{leg.departure}</span>
                        <span className="text-foreground">{leg.from}</span>
                        <span className="text-foreground/70">-&gt;</span>
                        <span className="text-foreground">{leg.to}</span>
                        <span className="ml-auto hidden text-xs text-foreground/80 sm:block">{leg.carrier}</span>
                      </div>
                    ))}
                  </div>
                </InfoCard>
              </div>
            </Section>
          )}

          {trip.tickets && trip.tickets.length > 0 && (
            <Section icon={Ticket} title="Bilhetes" delay={0.35}>
              {trip.tickets.map((ticket, index) => (
                <InfoCard key={`${ticket.name}-${index}`}>
                  <p className="font-body font-medium text-foreground">{ticket.name}</p>
                  {ticket.venue && <p className="mt-1 text-sm font-body text-foreground/75">{ticket.venue}</p>}
                  {ticket.address && <p className="text-xs font-body text-foreground/65">{ticket.address}</p>}
                  {ticket.seats && <p className="text-sm text-accent font-body mt-2">{ticket.seats}</p>}
                  {ticket.cost && <p className="text-sm font-semibold text-foreground mt-2">{formatEuro(ticket.cost)}</p>}
                </InfoCard>
              ))}
            </Section>
          )}

          {trip.hotels.length > 0 && (
            <Section icon={Hotel} title="Onde Ficamos" delay={0.4}>
              <div className="space-y-3">
                {trip.hotels.map((hotel, index) => (
                  <InfoCard key={`${hotel.name}-${index}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <p className="font-body font-medium text-foreground">{hotel.name}</p>
                        {hotel.address && <p className="mt-0.5 text-sm font-body text-foreground/75">{hotel.address}</p>}
                        {hotel.link && (
                          <a
                            href={hotel.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex text-sm font-body font-medium text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                          >
                            Abrir link do hotel
                          </a>
                        )}
                        {hotel.checkIn && hotel.checkOut && (
                          <p className="mt-1 text-sm font-body text-foreground/70">
                            {format(new Date(hotel.checkIn), "d MMM")} - {format(new Date(hotel.checkOut), "d MMM yyyy")}
                          </p>
                        )}
                        {hotel.phone && <p className="mt-1 text-xs font-body text-foreground/65">Tel. {hotel.phone}</p>}
                        {hotel.confirmationNumber && <p className="text-xs font-body text-foreground/65">Conf. #{hotel.confirmationNumber}</p>}
                      </div>
                      {hotel.cost && <p className="text-sm font-semibold text-foreground whitespace-nowrap">{formatEuro(hotel.cost)}</p>}
                    </div>
                  </InfoCard>
                ))}
              </div>
            </Section>
          )}

          {trip.foods.length > 0 && (
            <Section icon={UtensilsCrossed} title="O Que Comemos" delay={0.45}>
              <div className="grid gap-3">
                {trip.foods.map((food, index) => (
                  <InfoCard key={`${food.name}-${index}`}>
                    <div className="flex items-start gap-3">
                      {food.image ? (
                        <img src={food.image} alt={food.name} className="h-14 w-14 rounded-lg border border-border/60 object-cover shrink-0" loading="lazy" decoding="async" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg border border-border/60 bg-secondary/60 shrink-0" aria-hidden="true" />
                      )}
                      <div>
                        <p className="font-body font-medium text-foreground">{food.name}</p>
                        {food.description && <p className="mt-1 text-sm font-body text-foreground/75">{firstSentence(food.description)}</p>}
                      </div>
                    </div>
                  </InfoCard>
                ))}
              </div>
            </Section>
          )}

          {trip.expenses && trip.expenses.length > 0 && (
            <Section icon={Receipt} title="Despesas" delay={0.5}>
              <InfoCard>
                <div className="space-y-3">
                  {trip.expenses.map((expense, index) => (
                    <div key={`${expense.label}-${index}`} className="flex items-center justify-between text-sm font-body">
                      <span className="text-foreground/75">{expense.label}</span>
                      <span className="text-foreground font-medium">{formatEuro(expense.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3 flex items-center justify-between font-body">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-lg text-foreground">{formatEuro(totalFromExpenses || trip.cost)}</span>
                  </div>
                </div>
              </InfoCard>
            </Section>
          )}
        </div>
      </div>
    </motion.div>
  );
}
