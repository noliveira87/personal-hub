import { supabase } from "@/lib/supabase";
import { compressPdfFile } from "@/lib/pdfCompression";

export type WarrantyCategory = "tech" | "appliances" | "others";

export interface Warranty {
  id: string;
  productName: string;
  category: WarrantyCategory;
  price?: number;
  purchasedFrom?: string;
  purchaseDate: string; // ISO date
  warrantyYears: 2 | 3;
  expirationDate: string; // ISO date
  receiptDataUrl?: string; // base64 data URL
  archivedAt?: string; // ISO timestamp when archived
  createdAt: string;
}

export type WarrantyStatus = "active" | "expiring" | "expired";

type WarrantyRow = {
  id: string;
  product_name: string;
  category: string | null;
  price: string | number | null;
  purchased_from: string | null;
  purchase_date: string;
  warranty_years: number;
  expiration_date: string;
  receipt_url: string | null;
  archived_at: string | null;
  created_at: string;
};

function normalizeCategory(category: string | null | undefined): WarrantyCategory {
  if (category === "tech" || category === "appliances" || category === "others") {
    return category;
  }

  return "others";
}

function normalizePrice(price: string | number | null | undefined): number | undefined {
  if (price === null || price === undefined || price === "") {
    return undefined;
  }

  const parsed = typeof price === "number" ? price : Number(price);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapRowToWarranty(row: WarrantyRow): Warranty {
  return {
    id: row.id,
    productName: row.product_name,
    category: normalizeCategory(row.category),
    price: normalizePrice(row.price),
    purchasedFrom: row.purchased_from ?? undefined,
    purchaseDate: row.purchase_date,
    warrantyYears: row.warranty_years as 2 | 3,
    expirationDate: row.expiration_date,
    receiptDataUrl: row.receipt_url ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
  };
}

export async function loadWarranties(): Promise<Warranty[]> {
  const { data, error } = await supabase
    .from("warranties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading warranties:", error);
    return [];
  }

  return (data ?? []).map(mapRowToWarranty);
}

async function compressImageFile(file: File): Promise<File> {
  const imageBitmap = await createImageBitmap(file);

  const maxDimension = 2000;
  const ratio = Math.min(
    1,
    maxDimension / imageBitmap.width,
    maxDimension / imageBitmap.height
  );

  const targetWidth = Math.max(1, Math.round(imageBitmap.width * ratio));
  const targetHeight = Math.max(1, Math.round(imageBitmap.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.8);
  });

  if (!blob) return file;

  const compressedFileName = file.name.includes(".")
    ? `${file.name.split(".").slice(0, -1).join(".")}.webp`
    : `${file.name}.webp`;

  return new File([blob], compressedFileName, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

async function prepareReceiptFile(file: File): Promise<File> {
  if (file.type.startsWith("image/")) {
    try {
      const compressed = await compressImageFile(file);
      return compressed.size < file.size ? compressed : file;
    } catch {
      return file;
    }
  }

  return compressPdfFile(file);
}

export async function uploadReceipt(
  file: File,
  warrantyId: string,
  productName: string
): Promise<string | null> {
  if (!file) return null;

  const fileToUpload = await prepareReceiptFile(file);

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (fileToUpload.size > maxSize) {
    throw new Error("Receipt file must be smaller than 5MB");
  }

  // Generate clean filename: product-name-id.ext
  const sanitizedName = productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const baseName = sanitizedName || "receipt";
  const extension = fileToUpload.name.includes(".")
    ? fileToUpload.name.split(".").pop()?.toLowerCase()
    : undefined;
  const fileName = `${baseName}-${warrantyId}${extension ? `.${extension}` : ""}`;

  const { error } = await supabase.storage
    .from("receipts")
    .upload(fileName, fileToUpload, {
      contentType: fileToUpload.type || undefined,
      upsert: true,
    });

  if (error) {
    console.error("Error uploading receipt:", error);
    throw error;
  }

  const { data } = supabase.storage.from("receipts").getPublicUrl(fileName);

  return data.publicUrl;
}

function getReceiptPathFromUrl(receiptUrl: string): string | null {
  const markers = [
    "/storage/v1/object/public/receipts/",
    "/storage/v1/object/sign/receipts/",
    "/object/public/receipts/",
    "/object/sign/receipts/",
  ];

  const extractPath = (source: string) => {
    for (const marker of markers) {
      const markerIndex = source.indexOf(marker);
      if (markerIndex === -1) continue;

      const rawPath = source.slice(markerIndex + marker.length).split("?")[0];
      if (rawPath) return decodeURIComponent(rawPath);
    }

    return null;
  };

  try {
    const url = new URL(receiptUrl);
    const fromPathname = extractPath(url.pathname);
    if (fromPathname) return fromPathname;
  } catch {
    // ignore parse failures and try raw string fallback
  }

  return extractPath(receiptUrl);
}

export async function deleteReceiptByUrl(receiptUrl: string): Promise<void> {
  const receiptPath = getReceiptPathFromUrl(receiptUrl);
  if (!receiptPath) {
    throw new Error("Could not resolve receipt path from storage URL");
  }

  const { data, error } = await supabase.storage
    .from("receipts")
    .remove([receiptPath]);

  if (error) {
    console.error("Error deleting receipt:", error);
    throw error;
  }

  const objectError = data?.find((item) => item.error)?.error;
  if (objectError) {
    throw new Error(objectError);
  }
}

export async function addWarrantyToDb(warranty: Warranty) {
  const { error } = await supabase.from("warranties").insert({
    id: warranty.id,
    product_name: warranty.productName,
    category: warranty.category,
    price: warranty.price ?? null,
    purchased_from: warranty.purchasedFrom ?? null,
    purchase_date: warranty.purchaseDate,
    warranty_years: warranty.warrantyYears,
    expiration_date: warranty.expirationDate,
    receipt_url: warranty.receiptDataUrl ?? null,
    archived_at: null,
    created_at: warranty.createdAt,
  });

  if (error) throw error;
}

export async function updateWarrantyInDb(warranty: Warranty) {
  const { error } = await supabase
    .from("warranties")
    .update({
      product_name: warranty.productName,
      category: warranty.category,
      price: warranty.price ?? null,
      purchased_from: warranty.purchasedFrom ?? null,
      purchase_date: warranty.purchaseDate,
      warranty_years: warranty.warrantyYears,
      expiration_date: warranty.expirationDate,
      receipt_url: warranty.receiptDataUrl ?? null,
    })
    .eq("id", warranty.id);

  if (error) throw error;
}

export async function deleteWarrantyFromDb(id: string) {
  const { error } = await supabase.from("warranties").delete().eq("id", id);
  if (error) throw error;
}

export async function archiveWarrantyInDb(id: string) {
  const { error } = await supabase
    .from("warranties")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function unarchiveWarrantyInDb(id: string) {
  const { error } = await supabase
    .from("warranties")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw error;
}

export function getStatus(warranty: Warranty): WarrantyStatus {
  const now = new Date();
  const exp = new Date(warranty.expirationDate);
  if (exp < now) return "expired";

  const daysLeft = Math.ceil(
    (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 90) return "expiring";
  return "active";
}

export function getDaysLeft(warranty: Warranty): number {
  const now = new Date();
  const exp = new Date(warranty.expirationDate);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateExpiration(purchaseDate: string, years: 2 | 3): string {
  const d = new Date(purchaseDate);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split("T")[0];
}