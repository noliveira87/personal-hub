import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Edit3, ExternalLink, Image, Loader2, Plus, Save, Trash2, Upload, UtensilsCrossed, X } from "lucide-react";
import AppSectionHeader from "@/components/AppSectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loadTrips } from "@/lib/trips";
import { Trip } from "@/features/trips/types/trip";
import { useI18n } from "@/i18n/I18nProvider";
import {
  JourneyBite,
  JourneyBiteInput,
  createJourneyBite,
  deleteJourneyBite,
  loadJourneyBites,
  updateJourneyBite,
  uploadJourneyBitePhoto,
} from "@/lib/journeyBites";

type FormState = {
  tripId: string;
  dishName: string;
  description: string;
  restaurantName: string;
  reviewUrl: string;
  eatenOn: string;
  photoPath: string;
};

const buildInitialForm = (): FormState => ({
  tripId: "",
  dishName: "",
  description: "",
  restaurantName: "",
  reviewUrl: "",
  eatenOn: "",
  photoPath: "",
});

const toInput = (state: FormState): JourneyBiteInput => ({
  tripId: state.tripId,
  dishName: state.dishName,
  description: state.description,
  restaurantName: state.restaurantName,
  reviewUrl: state.reviewUrl,
  eatenOn: state.eatenOn,
  photoPath: state.photoPath,
});

export function JourneyBitesApp() {
  const { t, formatDate } = useI18n();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<JourneyBite[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => buildInitialForm());

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [trips],
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(buildInitialForm());
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const hydrateFormFromItem = (item: JourneyBite) => {
    setEditingId(item.id);
    setForm({
      tripId: item.tripId,
      dishName: item.dishName,
      description: item.description,
      restaurantName: item.restaurantName,
      reviewUrl: item.reviewUrl,
      eatenOn: item.eatenOn,
      photoPath: item.photoUrl,
    });
    setFormOpen(true);
  };

  const uploadedPhotoName = useMemo(() => {
    if (!form.photoPath) return "";

    try {
      const fromUrl = new URL(form.photoPath).pathname.split("/").pop();
      if (fromUrl) return decodeURIComponent(fromUrl);
    } catch {
      // no-op, can be a storage path instead of URL
    }

    const fromPath = form.photoPath.split("/").pop();
    return fromPath ?? form.photoPath;
  }, [form.photoPath]);

  const refreshData = async () => {
    const [journeyBitesResult, tripRows] = await Promise.all([loadJourneyBites(), loadTrips()]);
    setItems(journeyBitesResult.items);
    setSetupRequired(journeyBitesResult.setupRequired);
    setTrips(tripRows);
  };

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      const [journeyBitesResult, tripRows] = await Promise.all([loadJourneyBites(), loadTrips()]);
      if (!mounted) return;
      setItems(journeyBitesResult.items);
      setSetupRequired(journeyBitesResult.setupRequired);
      setTrips(tripRows);
      setLoading(false);
    };

    void fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const upload = await uploadJourneyBitePhoto(file);
      setForm((prev) => ({
        ...prev,
        photoPath: upload.path,
      }));
    } catch (error) {
      console.error("Error uploading journey bite photo:", error);
      alert(t("journeyBites.uploadError"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.tripId || !form.dishName.trim()) {
      alert(t("journeyBites.requiredFields"));
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateJourneyBite(editingId, toInput(form));
      } else {
        await createJourneyBite(toInput(form));
      }

      await refreshData();
      setFormOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving journey bite:", error);
      alert(t("journeyBites.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(t("journeyBites.confirmDelete"));
    if (!confirmed) return;

    setSaving(true);
    try {
      await deleteJourneyBite(id);
      await refreshData();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Error deleting journey bite:", error);
      alert(t("journeyBites.deleteError"));
    } finally {
      setSaving(false);
    }
  };

  const headerActions = (
    <Button
      onClick={openCreateForm}
      size="sm"
      className="h-10 w-10 rounded-xl px-0 gap-1.5 sm:h-9 sm:w-auto sm:px-3"
      aria-label={t("journeyBites.addAction")}
      title={t("journeyBites.addAction")}
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">{t("journeyBites.addAction")}</span>
    </Button>
  );

  return (
    <>
      <AppSectionHeader
        title={t("journeyBites.title")}
        icon={UtensilsCrossed}
        backTo="/"
        backLabel={t("common.backToProjects")}
        actions={headerActions}
      />
      <div className="h-16" aria-hidden="true" />

      <main className="container max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Card className="rounded-3xl border-border/70 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle>{t("journeyBites.title")}</CardTitle>
            <CardDescription>{t("journeyBites.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("journeyBites.loading")}</p>
            ) : null}

            {!loading && setupRequired ? (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-200">
                {t("journeyBites.setupRequired")}
              </div>
            ) : null}

            {!loading && !setupRequired && !items.length ? (
              <p className="text-sm text-muted-foreground">{t("journeyBites.empty")}</p>
            ) : null}

            {!loading && !setupRequired && items.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {items.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-border/80 bg-card/60">
                    <div className="aspect-[16/9] w-full bg-muted/40">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.dishName} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                          {t("journeyBites.noPhoto")}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 p-4">
                      <p className="text-lg font-semibold text-foreground">{item.dishName}</p>
                      {item.restaurantName ? <p className="text-sm text-muted-foreground">{item.restaurantName}</p> : null}

                      <p className="text-sm text-foreground/85">
                        {item.description || t("journeyBites.noDescription")}
                      </p>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>
                          {t("journeyBites.tripLabel")}: {item.trip?.title ?? "-"}
                        </p>
                        <p>
                          {t("journeyBites.dateLabel")}: {item.eatenOn ? formatDate(item.eatenOn) : "-"}
                        </p>
                      </div>

                      {item.reviewUrl ? (
                        <a
                          href={item.reviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          {t("journeyBites.review")}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}

                      <div className="flex items-center gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => hydrateFormFromItem(item)}>
                          <Edit3 className="mr-1 h-3.5 w-3.5" />
                          {t("journeyBites.edit")}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => { void handleDelete(item.id); }}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {t("journeyBites.delete")}
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {!loading && !setupRequired && !items.length ? (
              <div className="pt-2">
                <Button type="button" onClick={openCreateForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("journeyBites.addAction")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open && !saving && !uploading) {
            resetForm();
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? t("journeyBites.edit") : t("journeyBites.add")}</DialogTitle>
            <DialogDescription>{t("journeyBites.subtitle")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
                  autoFocus
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">{t("journeyBites.restaurantField")}</span>
                <Input
                  value={form.restaurantName}
                  onChange={(event) => setForm((prev) => ({ ...prev, restaurantName: event.target.value }))}
                  placeholder={t("journeyBites.restaurantPlaceholder")}
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
                  placeholder="https://..."
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                disabled={saving || uploading}
              >
                <X className="mr-2 h-4 w-4" />
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingId ? t("journeyBites.update") : t("journeyBites.create")}
              </Button>
            </div>
            {uploading ? <p className="text-xs text-muted-foreground">{t("journeyBites.uploading")}</p> : null}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
