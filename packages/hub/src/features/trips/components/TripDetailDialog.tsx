import { useState } from "react";
import { Calendar, Hotel, MapPin, Plane, Receipt, StickyNote, Ticket, Utensils, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trip } from "@/features/trips/types/trip";
import { useI18n } from "@/i18n/I18nProvider";
import { optimizeTripPhotoUrl } from "@/features/trips/utils/photo-url";
import { getLocalizedTripDestination, getLocalizedTripTitle } from "@/features/trips/utils/locations";

interface TripDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
}

const firstSentence = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1].trim() : trimmed;
};

const formatExternalUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export function TripDetailDialog({ open, onOpenChange, trip }: TripDetailDialogProps) {
  const { t, formatCurrency, formatDate, language } = useI18n();
  const [selectedFoodImage, setSelectedFoodImage] = useState<{ src: string; alt: string } | null>(null);

  if (!trip) return null;

  const totalExpenses = (trip.expenses ?? []).reduce((sum, item) => sum + item.amount, 0);
  const localizedTitle = getLocalizedTripTitle(trip, language);
  const localizedDestination = getLocalizedTripDestination(trip.destination, language);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">{localizedTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {localizedDestination}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(trip.startDate, { day: "2-digit", month: "short", year: "numeric" })} - {formatDate(trip.endDate, { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              <span className="font-semibold text-foreground">
                {formatCurrency(trip.cost, "EUR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {trip.photos.length ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t("common.photos")}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {trip.photos.map((photo, index) => (
                  <img key={`${photo}-${index}`} src={optimizeTripPhotoUrl(photo, { width: 420, quality: 68 })} alt={`${localizedTitle} ${t("trips.photoAlt")} ${index + 1}`} className="h-28 w-full rounded-xl object-cover" loading="lazy" decoding="async" />
                ))}
              </div>
            </section>
          ) : null}

          {trip.notes ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-foreground/85">
                  <StickyNote className="h-3.5 w-3.5" />
                </span>
                {t("common.notes")}
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{trip.notes}</p>
            </section>
          ) : null}

          {trip.travel ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-foreground/85">
                  <Plane className="h-3.5 w-3.5" />
                </span>
                {t("common.travel")}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t("trips.outbound")}</p>
                  <div className="space-y-2">
                    {trip.travel.outbound.map((leg, idx) => (
                      <p key={`out-${idx}`} className="text-sm text-foreground">
                        {leg.from} {" -> "} {leg.to} ({leg.departure}-{leg.arrival})
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t("trips.return")}</p>
                  <div className="space-y-2">
                    {trip.travel.returnTrip.map((leg, idx) => (
                      <p key={`ret-${idx}`} className="text-sm text-foreground">
                        {leg.from} {" -> "} {leg.to} ({leg.departure}-{leg.arrival})
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {trip.hotels.length ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-foreground/85">
                  <Hotel className="h-3.5 w-3.5" />
                </span>
                {t("common.hotels")}
              </h3>
              <div className="space-y-2">
                {trip.hotels.map((hotel, index) => (
                  <div key={`${hotel.name}-${index}`} className="rounded-xl border border-border/70 p-3 text-sm">
                    <p className="font-medium text-foreground">{hotel.name}</p>
                    {hotel.address ? <p className="text-muted-foreground">{hotel.address}</p> : null}
                    {hotel.link ? (
                      <a
                        href={hotel.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex font-medium text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                      >
                        {t("trips.openHotelLink")}
                      </a>
                    ) : null}
                    <p className="text-muted-foreground">
                      {hotel.checkIn || "-"} {" -> "} {hotel.checkOut || "-"}
                      {hotel.cost != null ? ` · ${formatCurrency(hotel.cost, "EUR", { minimumFractionDigits: 2 })}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {trip.foods.length ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-foreground/85">
                  <Utensils className="h-3.5 w-3.5" />
                </span>
                {t("trips.foodTitle")}
              </h3>
              <div className="space-y-2">
                {trip.foods.map((food, index) => (
                  <div key={`${food.name}-${index}`} className="rounded-xl border border-border/70 p-3 text-sm">
                    <div className="flex items-start gap-3">
                      {food.image ? (
                        <img
                          src={food.image}
                          alt={food.name}
                          className="h-12 w-12 rounded-md border border-border/60 object-cover shrink-0 cursor-zoom-in"
                          loading="lazy"
                          decoding="async"
                          onClick={() => setSelectedFoodImage({ src: food.image, alt: food.name || t("trips.foodPhoto") })}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-md border border-border/60 bg-secondary/60 shrink-0" aria-hidden="true" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{food.name}</p>
                        {food.description ? <p className="text-muted-foreground">{firstSentence(food.description)}</p> : null}
                        {food.reviewUrl ? (
                          <a
                            href={formatExternalUrl(food.reviewUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex font-medium text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                          >
                            {t("trips.openRestaurantReview")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {trip.tickets?.length ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-foreground/85">
                  <Ticket className="h-3.5 w-3.5" />
                </span>
                {t("common.tickets")}
              </h3>
              <div className="space-y-2">
                {trip.tickets.map((ticket, index) => (
                  <div key={`${ticket.name}-${index}`} className="rounded-xl border border-border/70 p-3 text-sm">
                    <p className="font-medium text-foreground">{ticket.name}</p>
                    {ticket.venue ? <p className="text-muted-foreground">{ticket.venue}</p> : null}
                    {ticket.cost != null ? (
                      <p className="text-muted-foreground">{formatCurrency(ticket.cost, "EUR", { minimumFractionDigits: 2 })}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {trip.expenses?.length ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-foreground/85">
                  <Receipt className="h-3.5 w-3.5" />
                </span>
                {t("common.expenses")}
              </h3>
              <div className="rounded-xl border border-border/70 p-3 space-y-2 text-sm">
                {trip.expenses.map((expense, index) => (
                  <div key={`${expense.label}-${index}`} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{expense.label}</span>
                    <span className="text-foreground">{formatCurrency(expense.amount, "EUR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="border-t border-border/70 pt-2 flex items-center justify-between font-semibold">
                  <span>{t("common.total")}</span>
                  <span>{formatCurrency(totalExpenses, "EUR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </section>
          ) : null}

          {selectedFoodImage ? (
            <div
              className="fixed inset-0 z-[100] bg-foreground/90 flex items-center justify-center p-4"
              onClick={() => setSelectedFoodImage(null)}
            >
              <button
                type="button"
                aria-label={t("trips.closePreview")}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedFoodImage(null);
                }}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/85 text-foreground shadow-sm backdrop-blur hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={selectedFoodImage.src}
                alt={selectedFoodImage.alt}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                decoding="async"
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
