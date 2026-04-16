import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Image, Package, CalendarDays, Clock, Store, Tag, Banknote } from "lucide-react";
import { calculateExpiration, deleteReceiptByUrl, type Warranty, type WarrantyCategory, uploadReceipt } from "@/lib/warranties";
import { generateUUID } from "@/lib/utils";
import { DEFAULT_WARRANTY_DEFAULTS_SETTINGS, loadWarrantyDefaultsSettings, type WarrantyDefaultsSettings } from "./lib/defaultSettings";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "@/components/ui/sonner";

interface Props {
  onAdd: (warranty: Warranty) => Promise<void> | void;
  trigger?: ReactNode;
}

const CATEGORY_OPTIONS: { value: WarrantyCategory; label: string }[] = [
  { value: "tech", label: "Tech" },
  { value: "appliances", label: "Appliances" },
  { value: "tools", label: "Tools" },
  { value: "others", label: "Others" },
];

export function AddWarrantyDialog({ onAdd, trigger }: Props) {
  const { t, formatDate } = useI18n();
  const [open, setOpen] = useState(false);
  const [defaultSettings, setDefaultSettings] = useState<WarrantyDefaultsSettings>(DEFAULT_WARRANTY_DEFAULTS_SETTINGS);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<WarrantyCategory>(DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultCategory);
  const [price, setPrice] = useState("");
  const [purchasedFrom, setPurchasedFrom] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [years, setYears] = useState<2 | 3>(DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultYears);
  const [receiptFile, setReceiptFile] = useState<File | undefined>();
  const [receiptName, setReceiptName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = (settings: WarrantyDefaultsSettings = defaultSettings) => {
    setName("");
    setCategory(settings.defaultCategory);
    setPrice("");
    setPurchasedFrom("");
    setDate(new Date().toISOString().split("T")[0]);
    setYears(settings.defaultYears);
    setReceiptFile(undefined);
    setReceiptName("");
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadDefaults = async () => {
      const settings = await loadWarrantyDefaultsSettings();
      if (cancelled) return;
      setDefaultSettings(settings);
      reset(settings);
    };

    void loadDefaults();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptName(file.name);
    setReceiptFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;

    setIsUploading(true);

    let receiptUrl: string | null = null;

    try {
      const warrantyId = generateUUID();

      if (receiptFile) {
        receiptUrl = await uploadReceipt(receiptFile, warrantyId, name.trim());
      }

      const warranty: Warranty = {
        id: warrantyId,
        productName: name.trim(),
        category,
        price: price ? Number(price) : undefined,
        purchasedFrom: purchasedFrom.trim() || undefined,
        purchaseDate: date,
        warrantyYears: years,
        expirationDate: calculateExpiration(date, years),
        receiptDataUrl: receiptUrl ?? undefined,
        createdAt: new Date().toISOString(),
      };

      await Promise.resolve(onAdd(warranty));
      reset();
      setOpen(false);
    } catch (error) {
      if (receiptUrl) {
        try {
          await deleteReceiptByUrl(receiptUrl);
        } catch (cleanupError) {
          console.error("Error cleaning up uploaded receipt:", cleanupError);
        }
      }
      console.error("Error:", error);
      toast.error(t("warranties.errors.upload"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="shrink-0 gap-2 shadow-md shadow-primary/20 active:scale-[0.97] transition-transform">
            <Plus className="h-5 w-5" />
            {t("warranties.addProduct")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("warranties.newWarranty")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              {t("warranties.productName")}
            </label>
            <Input
              placeholder={t("warranties.productNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              {t("warranties.purchasedFrom")}
            </label>
            <Input
              placeholder={t("warranties.purchasedFromPlaceholder")}
              value={purchasedFrom}
              onChange={(e) => setPurchasedFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" />
              {t("warranties.price")}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={t("warranties.pricePlaceholder")}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {t("warranties.categoryLabel")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  className={`h-10 rounded-lg px-2 text-xs font-medium transition-all active:scale-[0.96] sm:text-sm ${
                    category === option.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  }`}
                >
                  {t(`warranties.category.${option.value}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("warranties.purchaseDate")}
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t("warranties.warrantyLength")}
              </label>
              <div className="flex gap-2">
                {([2, 3] as const).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYears(y)}
                    className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all active:scale-[0.96] ${
                      years === y
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {t("warranties.yearsCount", { count: y })}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {date && (
            <p className="text-sm text-muted-foreground">
              {t("warranties.expiresOn")} {" "}
              <span className="font-medium text-foreground">
                {formatDate(calculateExpiration(date, years), {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
          )}

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm text-muted-foreground active:scale-[0.98] disabled:opacity-50"
            >
              {receiptFile ? (
                <>
                  <Image className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate text-foreground">{receiptName}</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 shrink-0" />
                  <span>{t("warranties.uploadReceiptOptional")}</span>
                </>
              )}
            </button>
          </div>

          <Button type="submit" className="w-full active:scale-[0.97] transition-transform" disabled={!name.trim() || !date || isUploading}>
            {isUploading ? t("warranties.uploading") : t("warranties.saveWarranty")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}