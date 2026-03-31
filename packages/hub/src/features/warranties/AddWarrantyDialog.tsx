import { useState, useRef } from "react";
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

interface Props {
  onAdd: (warranty: Warranty) => Promise<void> | void;
}

const CATEGORY_OPTIONS: { value: WarrantyCategory; label: string }[] = [
  { value: "tech", label: "Tech" },
  { value: "appliances", label: "Appliances" },
  { value: "others", label: "Others" },
];

export function AddWarrantyDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<WarrantyCategory>("others");
  const [price, setPrice] = useState("");
  const [purchasedFrom, setPurchasedFrom] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [years, setYears] = useState<2 | 3>(3);
  const [receiptFile, setReceiptFile] = useState<File | undefined>();
  const [receiptName, setReceiptName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setCategory("others");
    setPrice("");
    setPurchasedFrom("");
    setDate(new Date().toISOString().split("T")[0]);
    setYears(3);
    setReceiptFile(undefined);
    setReceiptName("");
  };

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
      alert("Failed to upload receipt. Please try again.");
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
        <Button size="lg" className="shrink-0 gap-2 shadow-md shadow-primary/20 active:scale-[0.97] transition-transform">
          <Plus className="h-5 w-5" />
          Add product
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New warranty</DialogTitle>
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
                  <span>Upload receipt (optional)</span>
                </>
              )}
            </button>
          </div>

          <Button type="submit" className="w-full active:scale-[0.97] transition-transform" disabled={!name.trim() || !date || isUploading}>
            {isUploading ? "Uploading..." : "Save warranty"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}