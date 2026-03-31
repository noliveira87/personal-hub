import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Star, Upload, X, Plane, Hotel, UtensilsCrossed, Ticket, Receipt } from "lucide-react";
import { FlightLeg, Trip, TripExpense, TripFood, TripHotel, TripTicket } from "@/features/trips/types/trip";
import { Header } from "@/features/trips/components/Header";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/lib/supabase";
import { getTicketsTotal } from "@/features/trips/utils/totals";

interface TripFormProps {
  trip?: Trip;
  onSave: (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 0.78;
const STORAGE_BUCKET = "trip-photos";
const INTERNATIONAL_SCOPE_TAG = "scope:international";
const DOMESTIC_SCOPE_TAG = "scope:domestic";

type TripScope = "auto" | "international" | "domestic";

const getScopeFromTags = (tripTags: string[]): TripScope => {
  const normalized = tripTags.map((tag) => tag.trim().toLowerCase());
  if (normalized.includes(DOMESTIC_SCOPE_TAG)) return "domestic";
  if (normalized.includes(INTERNATIONAL_SCOPE_TAG)) return "international";
  return "auto";
};

const applyScopeToTags = (tripTags: string[], scope: TripScope): string[] => {
  const cleaned = tripTags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const normalized = tag.toLowerCase();
      return normalized !== INTERNATIONAL_SCOPE_TAG && normalized !== DOMESTIC_SCOPE_TAG;
    });

  if (scope === "international") {
    return [...cleaned, INTERNATIONAL_SCOPE_TAG];
  }

  if (scope === "domestic") {
    return [...cleaned, DOMESTIC_SCOPE_TAG];
  }

  return cleaned;
};

const formatEditableTags = (tripTags: string[]) => tripTags
  .map((tag) => tag.trim())
  .filter(Boolean)
  .filter((tag) => {
    const normalized = tag.toLowerCase();
    return normalized !== INTERNATIONAL_SCOPE_TAG && normalized !== DOMESTIC_SCOPE_TAG;
  })
  .join(", ");

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
const emptyHotel = (): TripHotel => ({ name: "", link: "", address: "", checkIn: "", checkOut: "", cost: 0, phone: "", confirmationNumber: "" });
const emptyFood = (): TripFood => ({ name: "", description: "", reviewUrl: "" });
const emptyTicket = (): TripTicket => ({ name: "", venue: "", address: "", seats: "", cost: 0 });
const emptyExpense = (): TripExpense => ({ label: "", amount: 0 });

const toSortableDate = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const sortHotelsByDate = (items: TripHotel[]) => [...items].sort((left, right) => {
  const leftCheckIn = toSortableDate(left.checkIn);
  const rightCheckIn = toSortableDate(right.checkIn);

  if (leftCheckIn !== rightCheckIn) {
    return leftCheckIn - rightCheckIn;
  }

  const leftCheckOut = toSortableDate(left.checkOut);
  const rightCheckOut = toSortableDate(right.checkOut);

  if (leftCheckOut !== rightCheckOut) {
    return leftCheckOut - rightCheckOut;
  }

  return left.name.localeCompare(right.name, "pt-PT");
});

const isHotelDraft = (hotel: TripHotel) => !hotel.checkIn?.trim() && !hotel.checkOut?.trim();

const sortHotelsForForm = (items: TripHotel[]) => {
  const drafts = items.filter(isHotelDraft);
  const scheduled = items.filter((hotel) => !isHotelDraft(hotel));
  return [...drafts, ...sortHotelsByDate(scheduled)];
};

const normalizeExpenseLabel = (value: string) => value.trim().toLowerCase();

const buildHotelExpenseLabel = (hotelName: string) => `Hotel - ${hotelName.trim()}`;

const isHotelLinkedExpense = (expense: TripExpense, hotels: TripHotel[]) => {
  const normalizedLabel = normalizeExpenseLabel(expense.label);
  if (!normalizedLabel) return false;

  return hotels.some((hotel) => {
    const normalizedHotelName = hotel.name.trim().toLowerCase();
    if (!normalizedHotelName) return false;

    return normalizedLabel === normalizedHotelName
      || normalizedLabel === normalizeExpenseLabel(buildHotelExpenseLabel(hotel.name))
      || normalizedLabel.includes(normalizedHotelName);
  });
};

const buildMergedExpenses = (expenses: TripExpense[], hotels: TripHotel[]) => {
  const manualExpenses = expenses
    .filter((expense) => expense.label.trim())
    .filter((expense) => !isHotelLinkedExpense(expense, hotels));

  const hotelExpenses = hotels
    .filter((hotel) => hotel.name.trim() && Number(hotel.cost) > 0)
    .map((hotel) => ({
      label: buildHotelExpenseLabel(hotel.name),
      amount: Number(hotel.cost) || 0,
    }));

  return [...manualExpenses, ...hotelExpenses];
};

const buildHotelLookupQuery = (hotel: TripHotel, tripDestination: string) => {
  const parts = [hotel.name, hotel.address, tripDestination]
    .map((value) => value?.trim())
    .filter(Boolean);

  return parts.join(", ");
};

const buildHotelMapLink = (hotel: TripHotel, tripDestination: string) => {
  const query = buildHotelLookupQuery(hotel, tripDestination);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : hotel.link || "";
};

const firstSentence = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1].trim() : trimmed;
};

const normalizeFoodTitle = (value: string) => value
  .replace(/\s+/g, " ")
  .trim();

const CURATED_FOOD_DESCRIPTIONS: Record<string, string> = {
  cheesesteak: "A hot sandwich with thinly sliced beef and melted cheese, iconic street food.",
  "new york pizza": "Thin, foldable slices with tomato sauce and cheese, classic NYC style.",
  pizza: "Thin-crust pizza baked hot, a classic comfort-food favorite.",
  ramen: "Rich broth with noodles and warm toppings, deeply comforting.",
  sushi: "Seasoned rice with fresh fish and delicate flavor combinations.",
  tacos: "Soft or crisp tortillas with bold fillings and fresh toppings.",
  burger: "A juicy burger with toasted bun and well-balanced toppings.",
};

const SUMMARY_BLOCKLIST = [
  "fast-food chain",
  "restaurant chain",
  "company",
  "brand",
  "founded in",
  "headquartered",
  "is a dutch",
  "is an american company",
];

const SUMMARY_ALLOWLIST = [
  "dish",
  "food",
  "sandwich",
  "pizza",
  "cuisine",
  "noodle",
  "soup",
  "dessert",
  "street food",
];

const getCuratedFoodDescription = (foodName: string): string | null => {
  const normalized = normalizeFoodTitle(foodName).toLowerCase();
  if (!normalized) return null;

  const exact = CURATED_FOOD_DESCRIPTIONS[normalized];
  if (exact) return exact;

  const partial = Object.entries(CURATED_FOOD_DESCRIPTIONS)
    .find(([key]) => normalized.includes(key));
  return partial ? partial[1] : null;
};

const isFoodSummaryRelevant = (summary: string, foodName: string) => {
  const normalizedSummary = summary.toLowerCase();
  const normalizedFood = normalizeFoodTitle(foodName).toLowerCase();

  const hasBlockedTerm = SUMMARY_BLOCKLIST.some((term) => normalizedSummary.includes(term));
  const hasAllowedTerm = SUMMARY_ALLOWLIST.some((term) => normalizedSummary.includes(term));
  const hasFoodKeyword = normalizedFood
    .split(" ")
    .filter((token) => token.length >= 4)
    .some((token) => normalizedSummary.includes(token));

  if (hasBlockedTerm && !hasAllowedTerm) return false;
  return hasAllowedTerm || hasFoodKeyword;
};

const fetchFoodDescription = async (foodName: string): Promise<string | null> => {
  const normalizedName = normalizeFoodTitle(foodName);
  if (!normalizedName) return null;

  const curated = getCuratedFoodDescription(normalizedName);
  if (curated) return curated;

  const candidates = [
    `${normalizedName} dish`,
    `${normalizedName} food`,
    normalizedName,
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`);
      if (!response.ok) continue;

      const payload = await response.json() as { extract?: string; type?: string };
      if (payload.type === "disambiguation") continue;
      const extract = payload.extract?.trim();
      if (!extract) continue;

      const sentence = firstSentence(extract);
      if (!sentence || !isFoodSummaryRelevant(sentence, normalizedName)) continue;
      return sentence;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
};

const enrichFood = async (food: TripFood, destination: string, fallbackDescription: string): Promise<TripFood> => {
  const name = food.name?.trim();
  if (!name) return food;
  if (food.description?.trim()) return food;

  const fetchedDescription = await fetchFoodDescription(name);

  return {
    ...food,
    description: fetchedDescription || fallbackDescription,
  };
};

const enrichFoods = async (foods: TripFood[], destination: string, fallbackDescription: string) => Promise.all(
  foods.map((food) => enrichFood(food, destination, fallbackDescription)),
);

const hasUsableGoogleMapsQuery = (link?: string) => {
  const normalized = link?.trim();
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    const q = parsed.searchParams.get("query")?.trim();
    return Boolean(q);
  } catch {
    return normalized.includes("query=") ? !/query=\s*$/.test(normalized) : true;
  }
};

const enrichHotel = async (hotel: TripHotel, tripDestination: string): Promise<TripHotel> => {
  const normalizedName = hotel.name.trim();
  if (!normalizedName) return hotel;

  const fallbackLink = hasUsableGoogleMapsQuery(hotel.link)
    ? (hotel.link?.trim() || "")
    : buildHotelMapLink(hotel, tripDestination);
  const needsLink = !hotel.link?.trim();

  if (!needsLink) {
    return hotel;
  }

  return {
    ...hotel,
    // Keep address exactly as entered by the user; do not auto-enrich when empty.
    address: hotel.address,
    link: fallbackLink || hotel.link,
  };
};

const enrichHotels = async (hotels: TripHotel[], tripDestination: string) => Promise.all(
  hotels.map((hotel) => enrichHotel(hotel, tripDestination)),
);

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
      <Icon className="h-4 w-4 text-foreground" />
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
    </div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onAdd}
      className="gap-1 rounded-full border-border/70 bg-secondary/60 text-foreground hover:bg-secondary font-body text-xs"
    >
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
  const { t, formatCurrency } = useI18n();
  const [title, setTitle] = useState(trip?.title || "");
  const [destinations, setDestinations] = useState<string[]>(
    trip?.destinations?.length ? trip.destinations : [trip?.destination || ""],
  );
  const [startDate, setStartDate] = useState(trip?.startDate || "");
  const [endDate, setEndDate] = useState(trip?.endDate || "");
  const [notes, setNotes] = useState(trip?.notes || "");
  const [tags, setTags] = useState(formatEditableTags(trip?.tags || []));
  const [tripScope, setTripScope] = useState<TripScope>(getScopeFromTags(trip?.tags || []));
  const [photos, setPhotos] = useState<string[]>(trip?.photos || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingFoodThumb, setIsUploadingFoodThumb] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [selectedFoodPreview, setSelectedFoodPreview] = useState<{ src: string; alt: string } | null>(null);

  const [outbound, setOutbound] = useState<FlightLeg[]>(trip?.travel?.outbound || []);
  const [returnFlights, setReturnFlights] = useState<FlightLeg[]>(trip?.travel?.returnTrip || []);
  const [travelCost, setTravelCost] = useState(trip?.travel?.cost?.toString() || "");

  const [hotels, setHotels] = useState<TripHotel[]>(sortHotelsForForm(trip?.hotels || []));
  const [foods, setFoods] = useState<TripFood[]>(trip?.foods || []);
  const [tickets, setTickets] = useState<TripTicket[]>(trip?.tickets || []);
  const [expenses, setExpenses] = useState<TripExpense[]>(
    (trip?.expenses || []).filter((expense) => !isHotelLinkedExpense(expense, trip?.hotels || [])),
  );

  useEffect(() => {
    setTitle(trip?.title || "");
    setDestinations(trip?.destinations?.length ? trip.destinations : [trip?.destination || ""]);
    setStartDate(trip?.startDate || "");
    setEndDate(trip?.endDate || "");
    setNotes(trip?.notes || "");
    setTags(formatEditableTags(trip?.tags || []));
    setTripScope(getScopeFromTags(trip?.tags || []));
    setPhotos(trip?.photos || []);

    setOutbound(trip?.travel?.outbound || []);
    setReturnFlights(trip?.travel?.returnTrip || []);
    setTravelCost(trip?.travel?.cost?.toString() || "");

    setHotels(sortHotelsForForm(trip?.hotels || []));
    setFoods(trip?.foods || []);
    setTickets(trip?.tickets || []);
    setExpenses((trip?.expenses || []).filter((expense) => !isHotelLinkedExpense(expense, trip?.hotels || [])));
  }, [trip]);

  const mergedExpenses = buildMergedExpenses(expenses, hotels);

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
      alert(t("trips.photoUploadError"));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleFoodThumbnailUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingFoodThumb(true);
    try {
      const blob = await compressFileToBlob(file);
      const fileName = `foods/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error(`Upload falhou: ${error.message}`);
      const imageUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName).data.publicUrl;

      setFoods((prev) => prev.map((food, i) => (i === index ? { ...food, image: imageUrl } : food)));
    } catch (error) {
      console.error("Error uploading food thumbnail:", error);
      alert(t("trips.foodThumbnailUploadError"));
    } finally {
      setIsUploadingFoodThumb(false);
      event.target.value = "";
    }
  };

  const updateArray = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, field: keyof T, value: unknown) => {
    setter((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const updateHotel = (index: number, field: keyof TripHotel, value: unknown) => {
    setHotels((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeHotel = (index: number) => {
    setHotels((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFromArray = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    setPhotos((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const [photo] = next.splice(index, 1);
      next.splice(targetIndex, 0, photo);
      return next;
    });
  };

  const setCoverPhoto = (index: number) => {
    setPhotos((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const next = [...prev];
      const [photo] = next.splice(index, 1);
      next.unshift(photo);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedDestinations = destinations.map((value) => value.trim()).filter(Boolean);
    const primaryDestination = normalizedDestinations[0] || "";
    if (!title || !primaryDestination || !startDate || !endDate) return;

    setIsEnriching(true);
    try {
      const normalizedHotels = hotels.filter((hotel) => hotel.name.trim());
      const enrichedHotels = sortHotelsByDate(await enrichHotels(normalizedHotels, primaryDestination));
      setHotels(enrichedHotels);

      const normalizedFoods = foods.filter((food) => food.name.trim());
      const enrichedFoods = await enrichFoods(
        normalizedFoods,
        primaryDestination,
        t("trips.fallbackFoodDescription", { destination: primaryDestination }),
      );
      setFoods(enrichedFoods);

      const parsedTravelCost = parseFloat(travelCost) || 0;
      const normalizedTickets = tickets.filter((ticket) => ticket.name);

      const nextMergedExpenses = buildMergedExpenses(expenses, enrichedHotels);
      const totalCost = nextMergedExpenses.reduce((sum, item) => sum + (item.amount || 0), 0)
        + parsedTravelCost
        + getTicketsTotal(normalizedTickets);

      const parsedTags = tags
        ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
        : [];
      const finalTags = applyScopeToTags(parsedTags, tripScope);

      onSave({
      title,
      destination: primaryDestination,
      destinations: normalizedDestinations,
      startDate,
      endDate,
      cost: totalCost || 0,
      photos,
      hotels: enrichedHotels,
      foods: enrichedFoods,
      notes,
      tags: finalTags,
      travel: outbound.length > 0 || returnFlights.length > 0
        ? {
          outbound: outbound.filter((item) => item.from && item.to),
          returnTrip: returnFlights.filter((item) => item.from && item.to),
          cost: parsedTravelCost || undefined,
        }
        : undefined,
      tickets: normalizedTickets,
      expenses: nextMergedExpenses,
      });
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <>
      <Header />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
        <div className="sticky top-16 z-30 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="container mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={onCancel} className="gap-2 font-body text-muted-foreground hover:text-foreground rounded-full">
                <ArrowLeft className="h-4 w-4" />{t("trips.back")}
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl font-body h-10">
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  form="trip-form"
                  disabled={isUploading || isUploadingFoodThumb || isEnriching}
                  className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-body h-10"
                >
                  {isEnriching ? t("trips.enrichData") : (trip ? t("trips.saveChanges") : t("trips.createTrip"))}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 py-4">

          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-8">
            {trip ? t("trips.editTrip") : t("trips.newAdventure")}
          </h1>

          <form id="trip-form" onSubmit={handleSubmit} className="max-w-3xl space-y-10 pb-20">
            <section className="space-y-4">
              <h3 className="font-display text-lg font-semibold border-b border-border pb-2">{t("trips.generalInfo")}</h3>
              <div className="space-y-2">
                <Label className="font-body text-sm font-medium">{t("trips.title")}</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("trips.titlePlaceholder")} required className="rounded-xl" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-body text-sm font-medium">Destinations</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setDestinations((prev) => [...prev, ""])}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add destination
                  </Button>
                </div>
                {destinations.map((destination, index) => (
                  <div key={`destination-${index}`} className="flex items-center gap-2">
                    <Input
                      value={destination}
                      onChange={(event) => setDestinations((prev) => prev.map((item, i) => (i === index ? event.target.value : item)))}
                      placeholder={index === 0 ? `${t("trips.destinationPlaceholder")} (primary)` : t("trips.destinationPlaceholder")}
                      required={index === 0}
                      className="rounded-xl"
                    />
                    {destinations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDestinations((prev) => prev.filter((_, i) => i !== index))}
                        aria-label="Remove destination"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-body text-sm font-medium">{t("trips.startDate")}</Label>
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-sm font-medium">{t("trips.endDate")}</Label>
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required className="rounded-xl" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label className="font-body text-sm font-medium">{t("trips.tags")}</Label>
                  <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t("trips.tagsPlaceholder")} className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm font-medium">{t("trips.scope.label")}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={tripScope === "auto" ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setTripScope("auto")}
                  >
                    {t("trips.scope.auto")}
                  </Button>
                  <Button
                    type="button"
                    variant={tripScope === "international" ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setTripScope("international")}
                  >
                    {t("trips.scope.international")}
                  </Button>
                  <Button
                    type="button"
                    variant={tripScope === "domestic" ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setTripScope("domestic")}
                  >
                    {t("trips.scope.domestic")}
                  </Button>
                </div>
                <p className="text-xs font-body text-muted-foreground">
                  {t("trips.scope.hint")}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-sm font-medium">{t("trips.notesLabel")}</Label>
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("trips.notesPlaceholder")} rows={3} className="rounded-xl resize-none" />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-display text-lg font-semibold border-b border-border pb-2">{t("trips.photosTitle")}</h3>
              <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-accent/50 hover:bg-secondary/50 transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-body">{isUploading ? t("trips.uploadingPhotos") : t("trips.clickToUploadPhotos")}</span>
                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={isUploading} />
              </label>
              {photos.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-body text-muted-foreground">
                    {t("trips.photosHelp")}
                  </p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {photos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="relative aspect-square overflow-hidden rounded-lg group/photo border border-border/50 bg-secondary/20">
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                      {index === 0 && (
                        <span className="absolute left-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-body font-semibold uppercase tracking-[0.12em] text-foreground shadow-sm">
                          {t("trips.cover")}
                        </span>
                      )}
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover/photo:opacity-100 group-focus-within/photo:opacity-100">
                        <button
                          type="button"
                          aria-label={t("trips.movePhotoLeft")}
                          onClick={() => movePhoto(index, -1)}
                          disabled={index === 0}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/88 text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("trips.setAsCoverPhoto")}
                          onClick={() => setCoverPhoto(index)}
                          disabled={index === 0}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/88 text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("trips.movePhotoRight")}
                          onClick={() => movePhoto(index, 1)}
                          disabled={index === photos.length - 1}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/88 text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== index))}
                        className="absolute right-1 top-1 rounded-full bg-foreground/70 p-0.5 opacity-0 transition-opacity group-hover/photo:opacity-100"
                        aria-label={t("trips.removePhoto")}
                      >
                        <X className="h-3 w-3 text-background" />
                      </button>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Plane className="h-4 w-4 text-accent" />
                <h3 className="font-display text-lg font-semibold">{t("trips.flights")}</h3>
              </div>

              <div className="space-y-3">
                <SectionHeader icon={Plane} title={t("trips.outbound")} onAdd={() => setOutbound((prev) => [emptyFlight(), ...prev])} addLabel={t("trips.addFlight")} />
                {outbound.map((leg, index) => (
                  <div key={`out-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                    <RemoveBtn onClick={() => removeFromArray(setOutbound, index)} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input placeholder={t("trips.from")} value={leg.from} onChange={(event) => updateArray(setOutbound, index, "from", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.to")} value={leg.to} onChange={(event) => updateArray(setOutbound, index, "to", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.departure")} value={leg.departure} onChange={(event) => updateArray(setOutbound, index, "departure", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.arrival")} value={leg.arrival} onChange={(event) => updateArray(setOutbound, index, "arrival", event.target.value)} className="rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder={t("trips.airline")} value={leg.carrier || ""} onChange={(event) => updateArray(setOutbound, index, "carrier", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.flightNumber")} value={leg.flightNumber || ""} onChange={(event) => updateArray(setOutbound, index, "flightNumber", event.target.value)} className="rounded-lg text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <SectionHeader icon={Plane} title={t("trips.return")} onAdd={() => setReturnFlights((prev) => [emptyFlight(), ...prev])} addLabel={t("trips.addFlight")} />
                {returnFlights.map((leg, index) => (
                  <div key={`ret-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                    <RemoveBtn onClick={() => removeFromArray(setReturnFlights, index)} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input placeholder={t("trips.from")} value={leg.from} onChange={(event) => updateArray(setReturnFlights, index, "from", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.to")} value={leg.to} onChange={(event) => updateArray(setReturnFlights, index, "to", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.departure")} value={leg.departure} onChange={(event) => updateArray(setReturnFlights, index, "departure", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.arrival")} value={leg.arrival} onChange={(event) => updateArray(setReturnFlights, index, "arrival", event.target.value)} className="rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder={t("trips.airline")} value={leg.carrier || ""} onChange={(event) => updateArray(setReturnFlights, index, "carrier", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.flightNumber")} value={leg.flightNumber || ""} onChange={(event) => updateArray(setReturnFlights, index, "flightNumber", event.target.value)} className="rounded-lg text-sm" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="max-w-xs space-y-2">
                <Label className="font-body text-sm font-medium">{t("trips.totalFlightCost")}</Label>
                <Input type="number" step="0.01" value={travelCost} onChange={(event) => setTravelCost(event.target.value)} placeholder="2827.70" className="rounded-xl" />
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeader icon={Ticket} title={t("trips.eventsTickets")} onAdd={() => setTickets((prev) => [emptyTicket(), ...prev])} addLabel={t("trips.addTicket")} />
              {tickets.map((ticket, index) => (
                <div key={`ticket-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                  <RemoveBtn onClick={() => removeFromArray(setTickets, index)} />
                  <Input placeholder={t("trips.eventName")} value={ticket.name} onChange={(event) => updateArray(setTickets, index, "name", event.target.value)} className="rounded-lg text-sm" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder={t("trips.venue")} value={ticket.venue || ""} onChange={(event) => updateArray(setTickets, index, "venue", event.target.value)} className="rounded-lg text-sm" />
                    <Input placeholder={t("trips.address")} value={ticket.address || ""} onChange={(event) => updateArray(setTickets, index, "address", event.target.value)} className="rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder={t("trips.seats")} value={ticket.seats || ""} onChange={(event) => updateArray(setTickets, index, "seats", event.target.value)} className="rounded-lg text-sm" />
                    <Input type="number" step="0.01" placeholder={t("trips.costEur")} value={ticket.cost || ""} onChange={(event) => updateArray(setTickets, index, "cost", parseFloat(event.target.value) || 0)} className="rounded-lg text-sm" />
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <SectionHeader icon={Hotel} title={t("trips.accommodation")} onAdd={() => setHotels((prev) => sortHotelsForForm([emptyHotel(), ...prev]))} addLabel={t("trips.addHotel")} />
              {hotels.map((hotel, index) => (
                <div key={`hotel-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                  <RemoveBtn onClick={() => removeHotel(index)} />
                  <Input placeholder={t("trips.hotelName")} value={hotel.name} onChange={(event) => updateHotel(index, "name", event.target.value)} className="rounded-lg text-sm" />
                  <Input placeholder={t("trips.address")} value={hotel.address || ""} onChange={(event) => updateHotel(index, "address", event.target.value)} className="rounded-lg text-sm" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Input type="date" value={hotel.checkIn || ""} onChange={(event) => updateHotel(index, "checkIn", event.target.value)} className="rounded-lg text-sm" />
                    <Input type="date" value={hotel.checkOut || ""} onChange={(event) => updateHotel(index, "checkOut", event.target.value)} className="rounded-lg text-sm" />
                    <Input type="number" step="0.01" placeholder={t("trips.costEur")} value={hotel.cost || ""} onChange={(event) => updateHotel(index, "cost", parseFloat(event.target.value) || 0)} className="rounded-lg text-sm" />
                    <Input placeholder={t("trips.phone")} value={hotel.phone || ""} onChange={(event) => updateHotel(index, "phone", event.target.value)} className="rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder={t("trips.confirmationNumber")} value={hotel.confirmationNumber || ""} onChange={(event) => updateHotel(index, "confirmationNumber", event.target.value)} className="rounded-lg text-sm" />
                    <Input placeholder={t("trips.websiteLink")} value={hotel.link || ""} onChange={(event) => updateHotel(index, "link", event.target.value)} className="rounded-lg text-sm" />
                  </div>
                  <p className="text-xs font-body text-muted-foreground">
                    {t("trips.hotelExpenseHint")}
                  </p>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <SectionHeader icon={UtensilsCrossed} title={t("trips.foods")} onAdd={() => setFoods((prev) => [emptyFood(), ...prev])} addLabel={t("trips.addFood")} />
              {foods.map((food, index) => (
                <div key={`food-${index}`} className="relative bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                  <RemoveBtn onClick={() => removeFromArray(setFoods, index)} />
                  <div className="grid grid-cols-1 sm:grid-cols-[92px_1fr] gap-3 items-start">
                    <div className="space-y-2">
                      <div className="h-20 w-20 rounded-lg border border-border/60 overflow-hidden bg-secondary/60 flex items-center justify-center">
                        {food.image ? (
                          <img
                            src={food.image}
                            alt={food.name || t("trips.foods")}
                            className="h-full w-full cursor-zoom-in object-cover"
                            onClick={() => setSelectedFoodPreview({ src: food.image as string, alt: food.name || t("trips.foods") })}
                          />
                        ) : (
                          <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border/60 px-2 py-1 text-[11px] font-body text-foreground/75 hover:bg-secondary/50">
                        {t("trips.thumbnail")}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => void handleFoodThumbnailUpload(index, event)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <Input placeholder={t("trips.dishName")} value={food.name} onChange={(event) => updateArray(setFoods, index, "name", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.description")} value={food.description || ""} onChange={(event) => updateArray(setFoods, index, "description", event.target.value)} className="rounded-lg text-sm" />
                      <Input placeholder={t("trips.restaurantReviewUrl")} value={food.reviewUrl || ""} onChange={(event) => updateArray(setFoods, index, "reviewUrl", event.target.value)} className="rounded-lg text-sm" />
                    </div>
                  </div>
                  <p className="text-xs font-body text-muted-foreground">{t("trips.foodEnrichHint")}</p>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <SectionHeader icon={Receipt} title={t("common.expenses")} onAdd={() => setExpenses((prev) => [emptyExpense(), ...prev])} addLabel={t("trips.addExpense")} />
              <p className="text-xs font-body text-muted-foreground">
                {t("trips.extraExpensesHint")}
              </p>
              {expenses.map((expense, index) => (
                <div key={`expense-${index}`} className="relative bg-secondary/30 rounded-xl p-3 border border-border/40">
                  <RemoveBtn onClick={() => removeFromArray(setExpenses, index)} />
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder={t("trips.expenseDescription")} value={expense.label} onChange={(event) => updateArray(setExpenses, index, "label", event.target.value)} className="rounded-lg text-sm col-span-2" />
                    <Input type="number" step="0.01" placeholder={t("trips.eur")} value={expense.amount || ""} onChange={(event) => updateArray(setExpenses, index, "amount", parseFloat(event.target.value) || 0)} className="rounded-lg text-sm" />
                  </div>
                </div>
              ))}
              {mergedExpenses.length > 0 && (
                <p className="text-sm font-body text-right text-muted-foreground">
                  {t("common.total")}: <span className="font-semibold text-foreground">{formatCurrency(mergedExpenses.reduce((sum, item) => sum + (item.amount || 0), 0), "EUR", { minimumFractionDigits: 2 })}</span>
                </p>
              )}
            </section>

            {selectedFoodPreview && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4"
                onClick={() => setSelectedFoodPreview(null)}
              >
                <button
                  type="button"
                  aria-label={t("trips.closePreview")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedFoodPreview(null);
                  }}
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/85 text-foreground shadow-sm backdrop-blur hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
                <img
                  src={selectedFoodPreview.src}
                  alt={selectedFoodPreview.alt}
                  className="max-h-[85vh] max-w-full rounded-lg object-contain"
                  decoding="async"
                />
              </div>
            )}

          </form>
        </div>
      </motion.div>
    </>
  );
}
