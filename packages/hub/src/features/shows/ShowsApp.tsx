import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Heart, Image, Loader2, Pencil, Plus, Save, Star, Tag, Trash2, X } from "lucide-react";
import heic2any from "heic2any";
import AppSectionHeader from "@/components/AppSectionHeader";
import AppLoadingState from "@/components/AppLoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { toast } from "@/components/ui/sonner";
import {
  Show,
  ShowInput,
  createShow,
  deleteShow,
  loadShows,
  updateShow,
  uploadShowCoverImage,
} from "@/lib/shows";

type FormState = {
  title: string;
  date: string;
  venue: string;
  city: string;
  description: string;
  notes: string;
  rating: number;
  tags: string;
  favorite: boolean;
  coverImagePath: string;
  galleryImagePaths: string[];
};

const buildInitialForm = (): FormState => ({
  title: "",
  date: "",
  venue: "",
  city: "",
  description: "",
  notes: "",
  rating: 0,
  tags: "",
  favorite: false,
  coverImagePath: "",
  galleryImagePaths: [],
});

const toInput = (state: FormState): ShowInput => ({
  title: state.title,
  date: state.date,
  venue: state.venue,
  city: state.city,
  description: state.description || undefined,
  notes: state.notes || undefined,
  rating: state.rating,
  tags: state.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean),
  favorite: state.favorite,
  coverImagePath: state.coverImagePath || undefined,
  galleryPaths: state.galleryImagePaths,
});

const isHeicLikeFile = (file: File) => {
  const fileType = (file.type || "").toLowerCase();
  const fileName = file.name.toLowerCase();
  return fileType.includes("heic") || fileType.includes("heif") || /\.(heic|heif)$/i.test(fileName);
};

type HeicConverter = (options: {
  blob: Blob;
  toType: string;
  quality?: number;
}) => Promise<Blob | Blob[]>;

const resolveHeicConverter = (candidate: unknown): HeicConverter | null => {
  if (typeof candidate === "function") {
    return candidate as HeicConverter;
  }

  if (candidate && typeof candidate === "object") {
    const maybeDefault = (candidate as { default?: unknown }).default;
    if (typeof maybeDefault === "function") {
      return maybeDefault as HeicConverter;
    }

    if (maybeDefault && typeof maybeDefault === "object") {
      const nested = (maybeDefault as { default?: unknown }).default;
      if (typeof nested === "function") {
        return nested as HeicConverter;
      }
    }
  }

  return null;
};

const isImageLikeFile = (file: File) => {
  if (file.type.startsWith("image/")) return true;
  if (isHeicLikeFile(file)) return true;
  return /\.(jpe?g|png|webp|gif|bmp|avif|tiff?)$/i.test(file.name);
};

const loadImageFromBlob = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image-load-failed"));
    };

    image.src = objectUrl;
  });

const convertHeicToJpegBlob = async (file: File): Promise<Blob | null> => {
  try {
    const converter = resolveHeicConverter(heic2any);
    if (!converter) return null;

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    const shouldMuteHeifNoise = (args: unknown[]) => {
      const message = args
        .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
        .join(" ")
        .toLowerCase();

      return message.includes("could not parse heif") || message.includes("parse heif file");
    };

    console.error = (...args: unknown[]) => {
      if (shouldMuteHeifNoise(args)) return;
      originalConsoleError(...args);
    };
    console.warn = (...args: unknown[]) => {
      if (shouldMuteHeifNoise(args)) return;
      originalConsoleWarn(...args);
    };
    console.log = (...args: unknown[]) => {
      if (shouldMuteHeifNoise(args)) return;
      originalConsoleLog(...args);
    };

    let converted: Blob | Blob[];
    try {
      converted = await converter({
        blob: file,
        toType: "image/jpeg",
        quality: 0.82,
      });
    } finally {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
    }

    const firstBlob = Array.isArray(converted) ? (converted[0] ?? null) : converted;
    if (!firstBlob) return null;

    // Some converters return blobs without a MIME type. Normalize to JPEG for stable previews.
    return new Blob([firstBlob], { type: "image/jpeg" });
  } catch {
    return null;
  }
};

const compressImage = async (file: File): Promise<File> => {
  const isHeic = isHeicLikeFile(file);

  if (!isImageLikeFile(file)) {
    return file;
  }

  const buildImageFileName = (baseName: string, ext: string) => `${baseName.replace(/\.[^.]+$/, "") || "show-image"}.${ext}`;

  try {
    let source: Blob = file;
    let convertedHeicBlob: Blob | null = null;

    if (isHeic) {
      const converted = await convertHeicToJpegBlob(file);
      if (converted) {
        source = converted;
        convertedHeicBlob = converted;
      } else {
        throw new Error("heic-conversion-failed");
      }
    }

    const image = await loadImageFromBlob(source);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("canvas-context-missing");
    }

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.78);
    });

    if (!blob) {
      if (isHeic && convertedHeicBlob) {
        return new File([convertedHeicBlob], buildImageFileName(file.name, "jpg"), {
          type: "image/jpeg",
        });
      }
      return file;
    }

    return new File([blob], buildImageFileName(file.name, "webp"), {
      type: "image/webp",
    });
  } catch {
    if (isHeic) {
      const converted = await convertHeicToJpegBlob(file);
      if (converted) {
        return new File([converted], buildImageFileName(file.name, "jpg"), {
          type: "image/jpeg",
        });
      }
      throw new Error("heic-preview-failed");
    }
    return file;
  }
};

const isBucketMissingError = (message?: string) => /bucket not found/i.test(message ?? "");

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const buildFallbackPreviewDataUrl = (label: string) => {
  const safeLabel = encodeURIComponent(label.slice(0, 24));
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='220'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23e5e7eb'/><stop offset='100%' stop-color='%23cbd5e1'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)'/><text x='50%' y='46%' dominant-baseline='middle' text-anchor='middle' fill='%23374151' font-size='20' font-family='Arial,sans-serif'>HEIC</text><text x='50%' y='62%' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-size='12' font-family='Arial,sans-serif'>${safeLabel}</text></svg>`;
};

export function ShowsApp() {
  const { t, formatDate } = useI18n();
  const { confirm } = useConfirmDialog();

  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [formState, setFormState] = useState(buildInitialForm());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState<File[]>([]);
  const [selectedGalleryPreviews, setSelectedGalleryPreviews] = useState<string[]>([]);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const { items, setupRequired } = await loadShows();
    setShows(items);
    setSetupRequired(setupRequired);

    if (selectedShow) {
      const refreshed = items.find((item) => item.id === selectedShow.id) ?? null;
      setSelectedShow(refreshed);
      if (!refreshed) {
        setIsDetailDialogOpen(false);
      }
    }

    setIsLoading(false);
  };

  const filteredShows = useMemo(() => {
    return shows.filter((show) => {
      const matchesSearch =
        show.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        show.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        show.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFavorite = !filterFavorite || show.favorite;

      return matchesSearch && matchesFavorite;
    });
  }, [shows, searchQuery, filterFavorite]);

  const handleCoverFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await compressImage(file);
      const preview = await readFileAsDataUrl(compressedFile);
      setSelectedCoverFile(compressedFile);
      setFormState((prev) => ({
        ...prev,
        coverImagePath: preview,
      }));
    } catch {
      if (isHeicLikeFile(file)) {
        setSelectedCoverFile(file);
        setFormState((prev) => ({
          ...prev,
          coverImagePath: buildFallbackPreviewDataUrl(file.name),
        }));
      } else {
        toast.error(t("shows.messages.uploadError"));
      }
    }
  };

  const handleGalleryFilesSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const compressedFiles: File[] = [];
    const previews: string[] = [];
    let failedCount = 0;

    for (const file of files) {
      try {
        const compressedFile = await compressImage(file);
        const preview = await readFileAsDataUrl(compressedFile);

        compressedFiles.push(compressedFile);
        previews.push(preview);
      } catch {
        if (isHeicLikeFile(file)) {
          compressedFiles.push(file);
          previews.push(buildFallbackPreviewDataUrl(file.name));
        } else {
          failedCount += 1;
        }
      }
    }

    if (compressedFiles.length > 0) {
      setSelectedGalleryFiles((prev) => [...prev, ...compressedFiles]);
      setSelectedGalleryPreviews((prev) => [...prev, ...previews]);
    }

    if (failedCount > 0) {
      toast.error(t("shows.messages.galleryPreviewError"));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formState.title || !formState.date || !formState.venue || !formState.city) {
      toast.error(t("shows.messages.requiredFields"));
      return;
    }

    setIsSubmitting(true);
    try {
      let coverImagePath = formState.coverImagePath;
      let galleryImagePaths = [...formState.galleryImagePaths];
      let bucketMissingWarned = false;

      if (selectedCoverFile) {
        const { path, error } = await uploadShowCoverImage(selectedCoverFile);

        if (error || !path) {
          if (isBucketMissingError(error)) {
            toast.error(t("shows.messages.bucketMissing"));
            bucketMissingWarned = true;
            coverImagePath = "";
          } else {
            toast.error(error || t("shows.messages.uploadError"));
            return;
          }
        }

        if (path) {
          coverImagePath = path;
        }
      }

      for (const galleryFile of selectedGalleryFiles) {
        const { path, error } = await uploadShowCoverImage(galleryFile);

        if (error || !path) {
          if (isBucketMissingError(error)) {
            if (!bucketMissingWarned) {
              toast.error(t("shows.messages.bucketMissing"));
              bucketMissingWarned = true;
            }
            continue;
          }

          toast.error(error || t("shows.messages.galleryUploadError"));
          return;
        }

        galleryImagePaths.push(path);
      }

      const input = toInput({
        ...formState,
        coverImagePath,
        galleryImagePaths,
      });

      if (editingId) {
        const { error } = await updateShow(editingId, input);
        if (error) {
          toast.error(error);
        } else {
          toast.success(t("shows.messages.updateSuccess"));
          await loadData();
        }
      } else {
        const { error } = await createShow(input);
        if (error) {
          toast.error(error);
        } else {
          toast.success(t("shows.messages.createSuccess"));
          await loadData();
        }
      }

      setFormState(buildInitialForm());
      setSelectedCoverFile(null);
      setSelectedGalleryFiles([]);
      setSelectedGalleryPreviews([]);
      setEditingId(null);
      setIsDialogOpen(false);
    } catch {
      toast.error(t("shows.messages.uploadError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (show: Show) => {
    setFormState({
      title: show.title,
      date: show.date,
      venue: show.venue,
      city: show.city,
      description: show.description || "",
      notes: show.notes || "",
      rating: show.rating,
      tags: show.tags.join(", "),
      favorite: show.favorite || false,
      coverImagePath: show.coverImageUrl || "",
      galleryImagePaths: show.galleryPaths,
    });
    setSelectedCoverFile(null);
    setSelectedGalleryFiles([]);
    setSelectedGalleryPreviews([]);
    setEditingId(show.id);
    setIsDetailDialogOpen(false);
    setIsDialogOpen(true);
  };

  const handleDelete = async (show: Show) => {
    if (
      await confirm(
        t("shows.confirmDelete.title"),
        t("shows.confirmDelete.message", { title: show.title }),
        t("shows.confirmDelete.action")
      )
    ) {
      const { error } = await deleteShow(show.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success(t("shows.messages.deleteSuccess"));
        if (selectedShow?.id === show.id) {
          setSelectedShow(null);
          setIsDetailDialogOpen(false);
        }
        await loadData();
      }
    }
  };

  const handleOpenDialog = () => {
    setFormState(buildInitialForm());
    setSelectedCoverFile(null);
    setSelectedGalleryFiles([]);
    setSelectedGalleryPreviews([]);
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setSelectedCoverFile(null);
    setSelectedGalleryFiles([]);
    setSelectedGalleryPreviews([]);
    setFormState(buildInitialForm());
  };

  const handleToggleFavorite = async (show: Show) => {
    const { error } = await updateShow(show.id, { favorite: !show.favorite });
    if (error) {
      toast.error(error);
    } else {
      await loadData();
    }
  };

  const handleOpenShow = (show: Show) => {
    setSelectedShow(show);
    setIsDetailDialogOpen(true);
  };

  const headerActions = (
    <Button onClick={handleOpenDialog} size="sm" className="h-10 w-10 rounded-xl px-0 gap-1.5 sm:h-9 sm:w-auto sm:px-3">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">{t("shows.actions.new")}</span>
    </Button>
  );

  if (isLoading) {
    return <AppLoadingState />;
  }

  if (setupRequired) {
    return (
      <>
        <AppSectionHeader
          icon={Star}
          title={t("shows.title")}
          backTo="/"
          backLabel={t("common.backToProjects")}
          actions={headerActions}
        />
        <div className="h-16" aria-hidden="true" />
        <div className="container max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-900">{t("shows.setup.title")}</CardTitle>
              <CardDescription className="text-yellow-800">{t("shows.setup.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-yellow-700">{t("shows.setup.helper")}</p>
              <ul className="ml-2 list-inside list-disc space-y-1 text-sm text-yellow-700">
                <li>{t("shows.setup.bucketItem")}</li>
                <li>{t("shows.setup.tableItem")}</li>
                <li>{t("shows.setup.schemaItem")}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppSectionHeader
        icon={Star}
        title={t("shows.title")}
        backTo="/"
        backLabel={t("common.backToProjects")}
        actions={headerActions}
      />
      <div className="h-16" aria-hidden="true" />

      <main className="container max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Card className="rounded-3xl border-border/70 shadow-sm">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>{t("shows.title")}</CardTitle>
              <CardDescription>{t("shows.subtitle")}</CardDescription>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <Input
                  placeholder={t("shows.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button
                onClick={() => setFilterFavorite(!filterFavorite)}
                variant={filterFavorite ? "default" : "outline"}
                size="sm"
                className="w-full sm:w-auto"
              >
                <Heart className="mr-2 h-4 w-4" />
                {t("shows.favorites")}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {filteredShows.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">{shows.length === 0 ? t("shows.empty") : t("shows.noMatch")}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredShows.map((show) => (
                  <Card
                    key={show.id}
                    className="group relative h-96 sm:h-[30rem] md:h-[32rem] lg:h-[34rem] cursor-pointer overflow-hidden border-border/70 transition hover:-translate-y-0.5 hover:shadow-md"
                    onClick={() => handleOpenShow(show)}
                  >
                    {show.coverImageUrl ? (
                      <img src={show.coverImageUrl} alt={show.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-300 via-zinc-400 to-zinc-600" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleFavorite(show);
                      }}
                      className="absolute right-3 top-3 z-10 rounded-lg bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
                      aria-label={t("shows.actions.favoriteToggle")}
                    >
                      <Heart className={`h-5 w-5 ${show.favorite ? "fill-red-500 text-red-500" : "text-white"}`} />
                    </button>

                    <CardContent className="absolute inset-x-0 bottom-0 z-10 space-y-2 p-5 text-white">
                      <CardTitle className="line-clamp-2 text-2xl text-white drop-shadow-sm">{show.title}</CardTitle>
                      <p className="flex items-center gap-2 text-sm text-white/90">
                        <Calendar className="h-4 w-4" />
                        {formatDate(show.date)}
                      </p>
                      <p className="text-sm text-white/90">
                        <span className="font-semibold">{t("shows.fields.venue")}: </span>
                        {show.venue}
                      </p>
                      <p className="text-sm text-white/90">
                        <span className="font-semibold">{t("shows.fields.city")}: </span>
                        {show.city}
                      </p>
                      <p className="text-xs text-white/75">{t("shows.actions.openDetails")}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedShow?.title || t("shows.title")}</DialogTitle>
            <DialogDescription>{t("shows.actions.openDetails")}</DialogDescription>
          </DialogHeader>
          {selectedShow ? (
            <div>
              <div className="relative h-[26rem] sm:h-[30rem] overflow-hidden rounded-t-xl bg-muted">
                {selectedShow.coverImageUrl || selectedShow.galleryImageUrls[0] ? (
                  <img
                    src={selectedShow.coverImageUrl || selectedShow.galleryImageUrls[0]}
                    alt={selectedShow.title}
                    className="h-full w-full object-cover object-center"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent" />
                <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(selectedShow)}
                    className="h-9 w-9 border-white/40 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
                    aria-label={t("shows.actions.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => void handleDelete(selectedShow)}
                    className="h-9 w-9 border-white/40 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
                    aria-label={t("shows.actions.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h2 className="text-2xl font-bold leading-tight">{selectedShow.title}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/90">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedShow.date)}
                  </p>
                </div>
              </div>

              <div className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("shows.fields.venue")}</p>
                    <p className="mt-1">{selectedShow.venue}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("shows.fields.city")}</p>
                    <p className="mt-1">{selectedShow.city}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("shows.fields.rating")}</p>
                    <div className="mt-1 flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < selectedShow.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {selectedShow.tags.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("shows.fields.tags")}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedShow.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedShow.description ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("shows.fields.description")}</p>
                    <p className="mt-2 text-sm leading-relaxed">{selectedShow.description}</p>
                  </div>
                ) : null}

                {selectedShow.notes ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("shows.fields.notes")}</p>
                    <p className="mt-2 text-sm leading-relaxed">{selectedShow.notes}</p>
                  </div>
                ) : null}

                {selectedShow.galleryImageUrls.length > 0 ? (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("shows.fields.gallery")}</p>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {selectedShow.galleryImageUrls.map((url, index) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setPreviewImageUrl(url)}
                          className="group relative h-48 w-72 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          aria-label={`${t("shows.fields.gallery")} ${index + 1}`}
                        >
                          <img
                            src={url}
                            alt={`${t("shows.fields.gallery")} ${index + 1}`}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-70" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(previewImageUrl)}
        onOpenChange={(open) => {
          if (!open) setPreviewImageUrl(null);
        }}
      >
        <DialogContent className="max-w-5xl p-2 sm:p-3">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("shows.fields.gallery")}</DialogTitle>
            <DialogDescription>{t("shows.actions.openDetails")}</DialogDescription>
          </DialogHeader>
          {previewImageUrl ? (
            <div className="overflow-hidden rounded-lg bg-black">
              <img
                src={previewImageUrl}
                alt={t("shows.fields.gallery")}
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? t("shows.dialog.editTitle") : t("shows.dialog.createTitle")}</DialogTitle>
            <DialogDescription>
              {editingId ? t("shows.dialog.editDescription") : t("shows.dialog.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  {t("shows.fields.title")} *
                </label>
                <Input
                  id="title"
                  value={formState.title}
                  onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={t("shows.placeholders.title")}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="date" className="text-sm font-medium">
                  {t("shows.fields.date")} *
                </label>
                <Input
                  id="date"
                  type="date"
                  value={formState.date}
                  onChange={(e) => setFormState((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="venue" className="text-sm font-medium">
                  {t("shows.fields.venue")} *
                </label>
                <Input
                  id="venue"
                  value={formState.venue}
                  onChange={(e) => setFormState((prev) => ({ ...prev, venue: e.target.value }))}
                  placeholder={t("shows.placeholders.venue")}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="city" className="text-sm font-medium">
                  {t("shows.fields.city")} *
                </label>
                <Input
                  id="city"
                  value={formState.city}
                  onChange={(e) => setFormState((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder={t("shows.placeholders.city")}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="rating" className="text-sm font-medium">
                  {t("shows.fields.rating")}
                </label>
                <select
                  id="rating"
                  value={formState.rating}
                  onChange={(e) => setFormState((prev) => ({ ...prev, rating: parseInt(e.target.value, 10) }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  {[0, 1, 2, 3, 4, 5].map((val) => (
                    <option key={val} value={val}>
                      {val === 0 ? t("shows.rating.notRated") : t("shows.rating.stars", { count: val })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formState.favorite}
                    onChange={(e) => setFormState((prev) => ({ ...prev, favorite: e.target.checked }))}
                    className="mr-2"
                  />
                  {t("shows.fields.favorite")}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium">
                {t("shows.fields.tags")}
              </label>
              <Input
                id="tags"
                value={formState.tags}
                onChange={(e) => setFormState((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder={t("shows.placeholders.tags")}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                {t("shows.fields.description")}
              </label>
              <Textarea
                id="description"
                value={formState.description}
                onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("shows.placeholders.description")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                {t("shows.fields.notes")}
              </label>
              <Textarea
                id="notes"
                value={formState.notes}
                onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={t("shows.placeholders.notes")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("shows.fields.coverImage")}</label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => coverFileInputRef.current?.click()} className="flex-1">
                  <Image className="mr-2 h-4 w-4" />
                  {t("shows.actions.uploadImage")}
                </Button>
                {formState.coverImagePath ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedCoverFile(null);
                      setFormState((prev) => ({ ...prev, coverImagePath: "" }));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleCoverFileSelect}
                className="hidden"
              />
              {formState.coverImagePath ? (
                <div className="relative h-40 w-full overflow-hidden rounded-lg bg-muted">
                  <img src={formState.coverImagePath} alt={t("shows.previewAlt")} className="h-full w-full object-cover" />
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("shows.fields.gallery")}</label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => galleryFileInputRef.current?.click()}>
                  <Image className="mr-2 h-4 w-4" />
                  {t("shows.actions.uploadGallery")}
                </Button>
                {selectedGalleryPreviews.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedGalleryFiles([]);
                      setSelectedGalleryPreviews([]);
                    }}
                  >
                    {t("shows.actions.clearNewPhotos")}
                  </Button>
                ) : null}
              </div>

              <input
                ref={galleryFileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                onChange={handleGalleryFilesSelect}
                className="hidden"
              />

              {formState.galleryImagePaths.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {t("shows.gallery.existingCount", { count: formState.galleryImagePaths.length })}
                  </p>
                </div>
              ) : null}

              {selectedGalleryPreviews.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedGalleryPreviews.map((url, index) => (
                    <div key={`${url}-${index}`} className="overflow-hidden rounded-md bg-muted">
                      <img src={url} alt={`${t("shows.previewAlt")} ${index + 1}`} className="h-60 w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                {t("shows.actions.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("shows.actions.saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {editingId ? t("shows.actions.update") : t("shows.actions.create")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
