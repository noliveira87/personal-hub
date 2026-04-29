import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, ExternalLink, Image, Loader2, MapPin, Pencil, Plus, Trash2, Upload, UtensilsCrossed, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppSectionHeader from "@/components/AppSectionHeader";
import AppLoadingState from "@/components/AppLoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trip } from "@/features/trips/types/trip";
import { useI18n } from "@/i18n/I18nProvider";
import { loadTrips } from "@/lib/trips";
import { toast } from "@/components/ui/sonner";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import {
  JourneyBite,
  JourneyBiteInput,
  deleteJourneyBite,
  loadJourneyBiteById,
  updateJourneyBite,
  uploadJourneyBitePhoto,
} from "@/lib/journeyBites";

type FormState = {
  tripId: string;
  dishName: string;
  description: string;
  restaurantName: string;
  restaurantAddress: string;
  reviewUrl: string;
  eatenOn: string;
  photoPath: string;
};

const buildInitialForm = (): FormState => ({
  tripId: "",
  dishName: "",
  description: "",
  restaurantName: "",
  restaurantAddress: "",
  reviewUrl: "",
  eatenOn: "",
  photoPath: "",
});

const toInput = (state: FormState): JourneyBiteInput => ({
  tripId: state.tripId,
  dishName: state.dishName,
  description: state.description,
  restaurantName: state.restaurantName,
  restaurantAddress: state.restaurantAddress,
  reviewUrl: state.reviewUrl,
  eatenOn: state.eatenOn,
  photoPath: state.photoPath,
});

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
    <div className="mb-4 flex items-center gap-2">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-foreground/85">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
    </div>
    {children}
  </motion.section>
);

const InfoCard = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border/70 bg-secondary/65 p-5 shadow-sm">{children}</div>
);

const formatExternalUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export function JourneyBiteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatDate } = useI18n();
  const { confirm, confirmDialog } = useConfirmDialog();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [item, setItem] = useState<JourneyBite | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildInitialForm());
  const [selectedPhoto, setSelectedPhoto] = useState(false);

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [trips],
  );

  const hydrateForm = (selectedItem: JourneyBite) => {
    setForm({
      tripId: selectedItem.tripId,
      dishName: selectedItem.dishName,
      description: selectedItem.description,
      restaurantName: selectedItem.restaurantName,
      restaurantAddress: selectedItem.restaurantAddress,
      reviewUrl: selectedItem.reviewUrl,
      eatenOn: selectedItem.eatenOn,
      photoPath: selectedItem.photoUrl,
    });
  };

  const ensureTripsLoaded = async () => {
    if (trips.length) return;
    const tripRows = await loadTrips();
    setTrips(tripRows);
  };

  const refreshData = async () => {
    if (!id) return;
    const selectedItem = await loadJourneyBiteById(id);
    setItem(selectedItem);

    if (selectedItem) {
      hydrateForm(selectedItem);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (!id) {
        setItem(null);
        setLoading(false);
        return;
      }

      const selectedItem = await loadJourneyBiteById(id);
      if (!mounted) return;
      setItem(selectedItem);

      if (selectedItem) {
        hydrateForm(selectedItem);
      }

      setLoading(false);
    };

    void fetchData();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!formOpen) return;
    void ensureTripsLoaded();
  }, [formOpen]);

  const uploadedPhotoName = useMemo(() => {
    if (!form.photoPath) return "";

    try {
      const fromUrl = new URL(form.photoPath).pathname.split("/").pop();
      if (fromUrl) return decodeURIComponent(fromUrl);
    } catch {
      // no-op
    }

    const fromPath = form.photoPath.split("/").pop();
    return fromPath ?? form.photoPath;
  }, [form.photoPath]);

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const upload = await uploadJourneyBitePhoto(file);
      setForm((prev) => ({ ...prev, photoPath: upload.path }));
    } catch (error) {
      console.error("Error uploading journey bite photo:", error);
      const message = error instanceof Error ? error.message : t("journeyBites.uploadError");
      toast.error(message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;

    if (!form.tripId || !form.dishName.trim()) {
      toast.error(t("journeyBites.requiredFields"));
      return;
    }

    setSaving(true);
    try {
      await updateJourneyBite(id, toInput(form));
      await refreshData();
      setFormOpen(false);
    } catch (error) {
      console.error("Error updating journey bite:", error);
      toast.error(t("journeyBites.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = await confirm({ title: t("journeyBites.confirmDelete"), confirmLabel: t("common.delete"), cancelLabel: t("common.cancel") });
    if (!confirmed) return;

    setSaving(true);
    try {
      await deleteJourneyBite(id);
      navigate("/journey-bites");
    } catch (error) {
      console.error("Error deleting journey bite:", error);
      toast.error(t("journeyBites.deleteError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="container max-w-5xl px-4 py-8 sm:px-6">
        <AppLoadingState label={t("journeyBites.loading")} variant="table" />
      </main>
    );
  }

  if (!item) {
    return (
      <main className="container max-w-5xl px-4 py-8 sm:px-6">
        <Card className="rounded-3xl border-border/70 shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground">{t("journeyBites.notFound")}</p>
            <Button type="button" variant="outline" onClick={() => navigate("/journey-bites")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("journeyBites.backToList")}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
      <AppSectionHeader
        title={t("journeyBites.title")}
        icon={UtensilsCrossed}
        backTo="/journey-bites"
        backLabel={t("journeyBites.backToList")}
      />
      <div className="h-16" aria-hidden="true" />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
        <div className="sticky top-16 z-30 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="container mx-auto flex justify-end px-4 py-3 sm:px-6">
            <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    void ensureTripsLoaded();
                    setFormOpen(true);
                  }}
                  className="gap-2 rounded-full font-body text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                  {t("journeyBites.edit")}
                </Button>
                <Button variant="ghost" onClick={() => { void handleDelete(); }} className="gap-2 rounded-full font-body text-destructive hover:text-destructive" disabled={saving}>
                  <Trash2 className="h-4 w-4" />
                  {t("journeyBites.delete")}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    void ensureTripsLoaded();
                    setFormOpen(true);
                  }}
                  className="gap-2 rounded-full font-body text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                  {t("journeyBites.edit")}
                </Button>
                <Button variant="ghost" onClick={() => { void handleDelete(); }} className="gap-2 rounded-full font-body text-destructive hover:text-destructive" disabled={saving}>
                  <Trash2 className="h-4 w-4" />
                  {t("journeyBites.delete")}
                </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-6 pt-4 sm:px-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <h1 className="mb-3 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">{item.dishName}</h1>
            <div className="flex flex-wrap items-center gap-2.5 font-body">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-3 py-1.5 text-foreground/75">
                <MapPin className="h-4 w-4" />
                {item.trip?.destination ?? "-"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/50 px-3 py-1.5 text-foreground/75">
                <Calendar className="h-4 w-4" />
                {item.eatenOn ? formatDate(item.eatenOn, { day: "numeric", month: "short", year: "numeric" }) : "-"}
              </span>
            </div>
          </motion.div>
        </div>

        <div className="container mx-auto px-4 pb-12 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl"
          >
            {item.photoUrl ? (
              <img
                src={item.photoUrl}
                alt={item.dishName}
                className="aspect-[16/9] h-full w-full cursor-pointer object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
                decoding="async"
                onClick={() => setSelectedPhoto(true)}
              />
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl border border-border/70 bg-secondary/50 text-sm text-muted-foreground">
                {t("journeyBites.noPhoto")}
              </div>
            )}
          </motion.div>
        </div>

        {selectedPhoto && item.photoUrl ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4" onClick={() => setSelectedPhoto(false)}>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={item.photoUrl}
              alt={item.dishName}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              decoding="async"
            />
          </div>
        ) : null}

        <div className="container mx-auto px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-12">
            <Section icon={UtensilsCrossed} title={t("journeyBites.detailsSection")} delay={0.22}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-body font-semibold text-foreground/50 uppercase tracking-widest">{t("journeyBites.dishNameField")}</p>
                      <p className="mt-2 text-lg font-display font-bold text-foreground">{item.dishName || "-"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-body font-semibold text-foreground/50 uppercase tracking-widest">{t("journeyBites.dateField")}</p>
                      <p className="mt-2 text-sm font-body text-foreground/75">
                        {item.eatenOn ? formatDate(item.eatenOn, { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </p>
                    </div>
                  </div>
                </InfoCard>

                <InfoCard>
                  <p className="text-xs font-body font-semibold text-foreground/50 uppercase tracking-widest">{t("journeyBites.restaurantField")}</p>
                  <p className="mt-2 text-sm font-body text-foreground/75">{item.restaurantName || "-"}</p>
                  <p className="mt-1 text-xs font-body text-foreground/60">{item.restaurantAddress || "-"}</p>
                </InfoCard>

                <InfoCard>
                  <p className="text-xs font-body font-semibold text-foreground/50 uppercase tracking-widest">{t("journeyBites.tripField")}</p>
                  {item.trip ? (
                    <Link
                      to={`/trips?tripId=${item.trip.id}`}
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-body font-medium text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                    >
                      <span>{`${item.trip.title} (${item.trip.destination})`}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <p className="mt-0.5 text-sm font-body text-foreground/75">-</p>
                  )}
                </InfoCard>

                <InfoCard>
                  <p className="text-xs font-body font-semibold text-foreground/50 uppercase tracking-widest">{t("journeyBites.reviewField")}</p>
                  {item.reviewUrl ? (
                    <a
                      href={formatExternalUrl(item.reviewUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-body font-medium text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                    >
                      {t("journeyBites.review")}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <p className="mt-0.5 text-sm font-body text-foreground/75">-</p>
                  )}
                </InfoCard>

                <div className="sm:col-span-2">
                  <InfoCard>
                    <p className="text-xs font-body font-semibold text-foreground/50 uppercase tracking-widest">{t("journeyBites.descriptionField")}</p>
                    <p className="mt-2 font-body text-sm leading-relaxed text-foreground/75 sm:text-base">
                      {item.description || t("journeyBites.noDescription")}
                    </p>
                  </InfoCard>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </motion.div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("journeyBites.edit")}</DialogTitle>
            <DialogDescription>{t("journeyBites.editDescription")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t("journeyBites.tripField")}</span>
                <select
                  value={form.tripId}
                  onChange={(event) => setForm((prev) => ({ ...prev, tripId: event.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("journeyBites.selectTrip")}</option>
                  {sortedTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.title} - {trip.destination}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t("journeyBites.dishNameField")}</span>
                <Input
                  value={form.dishName}
                  onChange={(event) => setForm((prev) => ({ ...prev, dishName: event.target.value }))}
                  placeholder={t("journeyBites.dishNamePlaceholder")}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t("journeyBites.restaurantField")}</span>
                <Input
                  value={form.restaurantName}
                  onChange={(event) => setForm((prev) => ({ ...prev, restaurantName: event.target.value }))}
                  placeholder={t("journeyBites.restaurantNamePlaceholder")}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t("journeyBites.restaurantAddressField")}</span>
                <Input
                  value={form.restaurantAddress}
                  onChange={(event) => setForm((prev) => ({ ...prev, restaurantAddress: event.target.value }))}
                  placeholder={t("journeyBites.restaurantAddressPlaceholder")}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t("journeyBites.dateField")}</span>
                <Input
                  type="date"
                  value={form.eatenOn}
                  onChange={(event) => setForm((prev) => ({ ...prev, eatenOn: event.target.value }))}
                />
              </label>
            </div>

            <label className="space-y-1 text-sm block">
              <span className="text-muted-foreground">{t("journeyBites.descriptionField")}</span>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder={t("journeyBites.descriptionPlaceholder")}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t("journeyBites.reviewField")}</span>
                <Input
                  value={form.reviewUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, reviewUrl: event.target.value }))}
                  placeholder={t("journeyBites.reviewUrlPlaceholder")}
                />
              </label>

              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || saving}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm text-muted-foreground active:scale-[0.98] disabled:opacity-50"
                  >
                    {form.photoPath ? (
                      <>
                        <Image className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate text-foreground">{uploadedPhotoName}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 shrink-0" />
                        <span>{t("journeyBites.uploadPhoto")}</span>
                      </>
                    )}
                  </button>

                  {form.photoPath ? (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, photoPath: "" }))}
                      disabled={uploading || saving}
                      className="w-full h-9 rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      {t("journeyBites.removePhoto")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={saving || uploading}>
                <X className="mr-2 h-4 w-4" />
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {t("journeyBites.update")}
              </Button>
            </div>
            {uploading ? <p className="text-xs text-muted-foreground">{t("journeyBites.uploading")}</p> : null}
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
