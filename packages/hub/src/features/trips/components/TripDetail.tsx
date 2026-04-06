import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Hotel, UtensilsCrossed, StickyNote, Trash2, Plane, Ticket, Receipt, Pencil, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trip } from "@/features/trips/types/trip";
import { useI18n } from "@/i18n/I18nProvider";
import { optimizeTripPhotoUrl } from "@/features/trips/utils/photo-url";
import { getLocalizedTripDestination, getLocalizedTripTitle } from "@/features/trips/utils/locations";
import { getTripTotal, withFlightsInExpenses } from "@/features/trips/utils/totals";
import { 
  loadJourneyBites, 
  deleteJourneyBite, 
  updateJourneyBite,
  JourneyBite,
  JourneyBiteUpdate,
  uploadJourneyBitePhoto 
} from "@/lib/journeyBites";

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

const formatExternalUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export function TripDetail({ trip, onBack, onDelete, onEdit }: TripDetailProps) {
  const { t, formatCurrency, formatDate, language } = useI18n();
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [journeyBites, setJourneyBites] = useState<JourneyBite[]>([]);
  const [editingBiteId, setEditingBiteId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<JourneyBiteUpdate>({});
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tripTotal = getTripTotal(trip);
  const displayExpenses = withFlightsInExpenses(trip);
  const formatEuro = (value: number) => formatCurrency(value, "EUR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const localizedTitle = getLocalizedTripTitle(trip, language);
  const localizedDestination = getLocalizedTripDestination(trip.destination, language);

  useEffect(() => {
    const loadBites = async () => {
      try {
        const result = await loadJourneyBites();
        const tripBites = result.items.filter(bite => bite.tripId === trip.id);
        setJourneyBites(tripBites);
      } catch (error) {
        console.error("Error loading journey bites:", error);
      }
    };
    void loadBites();
  }, [trip.id]);

  const handleEditBite = (bite: JourneyBite) => {
    setEditingBiteId(bite.id);
    setEditFormData({
      dish_name: bite.dish_name,
      description: bite.description,
      restaurant_name: bite.restaurant_name,
      review_url: bite.review_url,
      eaten_on: bite.eaten_on,
    });
    setEditPhotoFile(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteBite = async (biteId: string) => {
    if (!confirm(t("journeyBites.confirmDelete"))) return;
    try {
      await deleteJourneyBite(biteId);
      setJourneyBites(journeyBites.filter(b => b.id !== biteId));
    } catch (error) {
      console.error("Error deleting bite:", error);
      alert(t("journeyBites.deleteFailed"));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setEditPhotoFile(file);
  };

  const handleSaveEdit = async () => {
    if (!editingBiteId) return;
    
    setIsLoading(true);
    try {
      let photoPath = editFormData.photo_path;
      if (editPhotoFile) {
        const result = await uploadJourneyBitePhoto(editPhotoFile);
        photoPath = result.path;
      }

      const updateData: JourneyBiteUpdate = {
        ...editFormData,
        photo_path: photoPath,
      };

      await updateJourneyBite(editingBiteId, updateData);

      const updated = await loadJourneyBites();
      const tripBites = updated.items.filter(bite => bite.tripId === trip.id);
      setJourneyBites(tripBites);
      
      setIsEditModalOpen(false);
      setEditingBiteId(null);
      setEditFormData({});
      setEditPhotoFile(null);
    } catch (error) {
      console.error("Error saving bite:", error);
      alert(t("journeyBites.saveFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack} className="gap-2 font-body text-muted-foreground hover:text-foreground rounded-full">
              <ArrowLeft className="h-4 w-4" />{t("trips.back")}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onEdit} className="gap-2 font-body text-muted-foreground hover:text-foreground rounded-full">
                <Pencil className="h-4 w-4" />{t("trips.edit")}
              </Button>
              <Button variant="ghost" onClick={() => onDelete(trip.id)} className="gap-2 font-body text-destructive hover:text-destructive rounded-full">
                <Trash2 className="h-4 w-4" />{t("trips.delete")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pt-4 pb-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-3">{localizedTitle}</h1>
          <div className="flex flex-wrap items-center gap-2.5 font-body">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-3 py-1.5 text-foreground/75">
              <MapPin className="h-4 w-4" />{localizedDestination}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-3 py-1.5 text-foreground/75">
              <Calendar className="h-4 w-4" />
              {formatDate(trip.startDate, { month: "short", day: "numeric" })} - {formatDate(trip.endDate, { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground text-background px-3 py-1.5 font-semibold shadow-sm">
              {formatEuro(tripTotal)}
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
                <img src={optimizeTripPhotoUrl(photo, { width: index === 0 ? 1200 : 700, quality: 70 })} alt={`${localizedTitle} ${t("trips.photoAlt")} ${index + 1}`} className="w-full h-full object-cover aspect-square hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
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
            <Section icon={StickyNote} title={t("trips.ourStory")} delay={0.25}>
              <p className="font-body text-base leading-relaxed text-foreground/80 sm:text-lg">{trip.notes}</p>
            </Section>
          )}

          {trip.travel && (
            <Section icon={Plane} title={t("common.travel")} delay={0.3}>
              <div className="space-y-4">
                <InfoCard>
                  <p className="mb-3 text-xs font-body font-semibold uppercase tracking-wider text-foreground/75">{t("trips.outbound")} - {formatDate(trip.startDate, { day: "numeric", month: "short", year: "numeric" })}</p>
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
                  <p className="mb-3 text-xs font-body font-semibold uppercase tracking-wider text-foreground/75">{t("trips.return")} - {formatDate(trip.endDate, { day: "numeric", month: "short", year: "numeric" })}</p>
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
            <Section icon={Ticket} title={t("common.tickets")} delay={0.35}>
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
            <Section icon={Hotel} title={t("trips.whereWeStayed")} delay={0.4}>
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
                            {t("trips.openHotelLink")}
                          </a>
                        )}
                        {hotel.checkIn && hotel.checkOut && (
                          <p className="mt-1 text-sm font-body text-foreground/70">
                            {formatDate(hotel.checkIn, { day: "numeric", month: "short" })} - {formatDate(hotel.checkOut, { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {hotel.phone && <p className="mt-1 text-xs font-body text-foreground/65">{t("trips.phonePrefix")}{t("trips.phonePrefix").endsWith(".") ? " " : ": "}{hotel.phone}</p>}
                        {hotel.confirmationNumber && <p className="text-xs font-body text-foreground/65">{t("trips.confirmationPrefix")} #{hotel.confirmationNumber}</p>}
                      </div>
                      {hotel.cost && <p className="text-sm font-semibold text-foreground whitespace-nowrap">{formatEuro(hotel.cost)}</p>}
                    </div>
                  </InfoCard>
                ))}
              </div>
            </Section>
          )}

          {journeyBites.length > 0 && (
            <Section icon={UtensilsCrossed} title={t("trips.whereWeAte")} delay={0.45}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {journeyBites.map((bite) => (
                  <div
                    key={bite.id}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-secondary/40 hover:border-border/80 transition-all"
                    onClick={() => handleEditBite(bite)}
                    title={bite.dish_name}
                  >
                    {bite.photo_url ? (
                      <img
                        src={bite.photo_url}
                        alt={bite.dish_name}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs font-body text-foreground/50 text-center px-1">
                        {bite.dish_name}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors" />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {journeyBites.length > 0 && (
            <Section icon={UtensilsCrossed} title={t("journeyBites.title")} delay={0.5}>
              <div className="grid gap-3">
                {journeyBites.map((bite) => (
                  <InfoCard key={bite.id}>
                    <div className="flex items-start gap-3">
                      {bite.photo_url ? (
                        <img
                          src={bite.photo_url}
                          alt={bite.dish_name}
                          className="h-14 w-14 rounded-lg border border-border/60 object-cover shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg border border-border/60 bg-secondary/60 shrink-0" aria-hidden="true" />
                      )}
                      <div className="flex-1">
                        <p className="font-body font-medium text-foreground">{bite.dish_name}</p>
                        {bite.restaurant_name && <p className="mt-0.5 text-sm font-body text-foreground/75">{bite.restaurant_name}</p>}
                        {bite.description && <p className="mt-1 text-sm font-body text-foreground/75">{bite.description}</p>}
                        {bite.eaten_on && <p className="mt-1 text-xs font-body text-foreground/65">{formatDate(bite.eaten_on, { day: "numeric", month: "short", year: "numeric" })}</p>}
                        {bite.review_url && (
                          <a
                            href={/^https?:\/\//i.test(bite.review_url) ? bite.review_url : `https://${bite.review_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex text-sm font-body font-medium text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                          >
                            {t("trips.openRestaurantReview")}
                          </a>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => handleEditBite(bite)}
                          >
                            <Pencil className="h-3 w-3" />
                            {t("common.edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive gap-1.5"
                            onClick={() => handleDeleteBite(bite.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("common.delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </InfoCard>
                ))}
              </div>
            </Section>
          )}

          {displayExpenses.length > 0 && (
            <Section icon={Receipt} title={t("common.expenses")} delay={0.5}>
              <InfoCard>
                <div className="space-y-3">
                  {displayExpenses.map((expense, index) => (
                    <div key={`${expense.label}-${index}`} className="flex items-center justify-between text-sm font-body">
                      <span className="text-foreground/75">{expense.label}</span>
                      <span className="text-foreground font-medium">{formatEuro(expense.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3 flex items-center justify-between font-body">
                    <span className="font-semibold text-foreground">{t("common.total")}</span>
                    <span className="font-bold text-lg text-foreground">{formatEuro(tripTotal)}</span>
                  </div>
                </div>
              </InfoCard>
            </Section>
          )}
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("journeyBites.editBite")}</DialogTitle>
            <DialogDescription>{t("journeyBites.editDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-1.5">{t("journeyBites.dishName")}</label>
              <Input
                type="text"
                value={editFormData.dish_name || ""}
                onChange={(e) => setEditFormData({ ...editFormData, dish_name: e.currentTarget.value })}
                placeholder={t("journeyBites.dishNamePlaceholder")}
                className="font-body"
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-1.5">{t("journeyBites.restaurantName")}</label>
              <Input
                type="text"
                value={editFormData.restaurant_name || ""}
                onChange={(e) => setEditFormData({ ...editFormData, restaurant_name: e.currentTarget.value })}
                placeholder={t("journeyBites.restaurantNamePlaceholder")}
                className="font-body"
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-1.5">{t("journeyBites.description")}</label>
              <Textarea
                value={editFormData.description || ""}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.currentTarget.value })}
                placeholder={t("journeyBites.descriptionPlaceholder")}
                className="font-body min-h-20 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-1.5">{t("journeyBites.eatenOn")}</label>
              <Input
                type="date"
                value={editFormData.eaten_on || ""}
                onChange={(e) => setEditFormData({ ...editFormData, eaten_on: e.currentTarget.value })}
                className="font-body"
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-1.5">{t("journeyBites.reviewUrl")}</label>
              <Input
                type="text"
                value={editFormData.review_url || ""}
                onChange={(e) => setEditFormData({ ...editFormData, review_url: e.currentTarget.value })}
                placeholder={t("journeyBites.reviewUrlPlaceholder")}
                className="font-body"
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-foreground mb-1.5">{t("journeyBites.uploadPhoto")}</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/70 p-4 transition-colors hover:border-foreground/40 hover:bg-secondary/20"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-body text-foreground/75">
                  {editPhotoFile ? editPhotoFile.name : t("journeyBites.selectPhoto")}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingBiteId(null);
                  setEditFormData({});
                  setEditPhotoFile(null);
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => { void handleSaveEdit(); }}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "..." : t("common.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
