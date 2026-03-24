import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Image, Store, Package, CalendarDays, Clock, Tag, Banknote, X } from "lucide-react";
import { calculateExpiration, deleteReceiptByUrl, type Warranty, type WarrantyCategory, uploadReceipt } from "@/lib/warranties";

interface Props {
  warranty: Warranty;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: Warranty) => void;
}

const CATEGORY_OPTIONS: { value: WarrantyCategory; label: string }[] = [
  { value: "tech", label: "Tech" },
  { value: "appliances", label: "Appliances" },
  { value: "others", label: "Others" },
];

export function EditWarrantyDialog({ warranty, open, onOpenChange, onSave }: Props) {
  const [name, setName] = useState(warranty.productName);
  const [category, setCategory] = useState<WarrantyCategory>(warranty.category ?? "others");
  const [price, setPrice] = useState(warranty.price?.toString() ?? "");
  const [purchasedFrom, setPurchasedFrom] = useState(warranty.purchasedFrom ?? "");
  const [date, setDate] = useState(warranty.purchaseDate);
  const [years, setYears] = useState<2 | 3>(warranty.warrantyYears);
  const [receiptFile, setReceiptFile] = useState<File | undefined>();
  const [receiptName, setReceiptName] = useState(warranty.receiptDataUrl ? "Existing receipt" : "");
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState(warranty.receiptDataUrl);
  const [removeCurrentReceipt, setRemoveCurrentReceipt] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(warranty.productName);
      setCategory(warranty.category ?? "others");
      setPrice(warranty.price?.toString() ?? "");
      setPurchasedFrom(warranty.purchasedFrom ?? "");
      setDate(warranty.purchaseDate);
      setYears(warranty.warrantyYears);
      setReceiptFile(undefined);
      setReceiptName(warranty.receiptDataUrl ? "Existing receipt" : "");
      setCurrentReceiptUrl(warranty.receiptDataUrl);
      setRemoveCurrentReceipt(false);
    }
  }, [open, warranty]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptName(file.name);
    setReceiptFile(file);
    setRemoveCurrentReceipt(false);
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(undefined);
    setReceiptName("");
    setCurrentReceiptUrl(undefined);
    setRemoveCurrentReceipt(Boolean(warranty.receiptDataUrl));

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;

    setIsUploading(true);

    try {
      let receiptUrl = currentReceiptUrl;

      if (removeCurrentReceipt && warranty.receiptDataUrl) {
        await deleteReceiptByUrl(warranty.receiptDataUrl);
        receiptUrl = undefined;
      }

      if (receiptFile) {
        receiptUrl = await uploadReceipt(receiptFile, warranty.id, name.trim());
      }

      onSave({
        ...warranty,
        productName: name.trim(),
        category,
        price: price ? Number(price) : undefined,
        purchasedFrom: purchasedFrom.trim() || undefined,
        purchaseDate: date,
        warrantyYears: years,
        expirationDate: calculateExpiration(date, years),
        receiptDataUrl: receiptUrl ?? undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error:", error);
      alert(
        error instanceof Error
          ? `Failed to save changes: ${error.message}`
          : "Failed to save changes. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit warranty</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Product name
            </label>
            <Input
              placeholder="e.g. Samsung Dishwasher"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Purchased from
            </label>
            <Input
              placeholder="e.g. Worten, Amazon, IKEA"
              value={purchasedFrom}
              onChange={(e) => setPurchasedFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" />
              Price
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 299.99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  className={`h-10 rounded-lg text-sm font-medium transition-all active:scale-[0.96] ${
                    category === option.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Purchase date
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
                Warranty
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
                    {y} years
                  </button>
                ))}
              </div>
            </div>
          </div>

          {date && (
            <p className="text-sm text-muted-foreground">
              Expires on{" "}
              <span className="font-medium text-foreground">
                {new Date(calculateExpiration(date, years)).toLocaleDateString("en-US", {
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
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm text-muted-foreground active:scale-[0.98] disabled:opacity-50"
              >
                {receiptFile || currentReceiptUrl ? (
                  <>
                    <Image className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate text-foreground">{receiptName}</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 shrink-0" />
                    <span>Upload receipt (optional)</span>
                  </>
                )}
              </button>

              {(receiptFile || currentReceiptUrl) && (
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  disabled={isUploading}
                  className="w-full h-9 rounded-lg border border-border bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Remove receipt
                </button>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full active:scale-[0.97] transition-transform" disabled={!name.trim() || !date || isUploading}>
            {isUploading ? "Uploading..." : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
