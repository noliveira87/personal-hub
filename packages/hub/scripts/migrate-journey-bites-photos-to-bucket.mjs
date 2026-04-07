#!/usr/bin/env node
/**
 * One-time migration: copies legacy Journey Bites photo URLs (e.g. trip-photos)
 * into the `journey-bites` bucket and updates `journey_bites.photo_path` to the
 * new storage path.
 *
 * Run:
 *   source ../../.env.local && node scripts/migrate-journey-bites-photos-to-bucket.mjs
 *
 * Optional dry run:
 *   source ../../.env.local && node scripts/migrate-journey-bites-photos-to-bucket.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const BUCKET = "journey-bites";
const DRY_RUN = process.argv.includes("--dry-run");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const isHttpUrl = (value) => /^https?:\/\//i.test(value);
const isDataUrl = (value) => /^data:/i.test(value);

const extractJourneyBitesPathFromUrl = (value) => {
  if (!isHttpUrl(value)) return null;

  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const rawPath = url.pathname.slice(markerIndex + marker.length);
    return decodeURIComponent(rawPath);
  } catch {
    return null;
  }
};

const extFromMime = (mime) => {
  const normalized = (mime || "").toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  return "jpg";
};

const extFromPath = (value) => {
  const match = value.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  if (!match) return null;
  return match[1].toLowerCase();
};

const contentTypeFromExt = (ext) => {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
};

const parseDataUrl = (value) => {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1] || "image/jpeg";
  const base64Payload = match[2] || "";
  return {
    buffer: Buffer.from(base64Payload, "base64"),
    mime,
    ext: extFromMime(mime),
  };
};

const fetchRemoteImage = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} when downloading ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeHeader = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
  const ext = extFromMime(mimeHeader) || extFromPath(url) || "jpg";
  const mime = mimeHeader || contentTypeFromExt(ext);

  return { buffer, mime, ext };
};

const createDestinationPath = (id, ext) => {
  const safeExt = (ext || "jpg").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
  return `foods/migrated/${id}-${crypto.randomUUID()}.${safeExt}`;
};

const loadJourneyBiteRows = async () => {
  const rows = [];
  const pageSize = 500;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("journey_bites")
      .select("id, photo_path")
      .not("photo_path", "is", null)
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const batch = data || [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
};

const { error: bucketCheckError } = await supabase.storage.from(BUCKET).list("", { limit: 1 });
if (bucketCheckError) {
  console.error(`Cannot access bucket "${BUCKET}".`);
  console.error("Please ensure it exists and is accessible.");
  console.error("Error:", bucketCheckError.message);
  process.exit(1);
}

console.log(`Using bucket: ${BUCKET}`);
if (DRY_RUN) {
  console.log("Dry run mode: no DB updates will be written.");
}

const rows = await loadJourneyBiteRows();
console.log(`Found ${rows.length} journey bite row(s) with photo_path.\n`);

let migrated = 0;
let normalized = 0;
let skipped = 0;
let failed = 0;

for (const row of rows) {
  const id = row.id;
  const rawValue = typeof row.photo_path === "string" ? row.photo_path.trim() : "";

  if (!rawValue) {
    skipped += 1;
    continue;
  }

  // Already a storage path in journey-bites bucket.
  if (!isHttpUrl(rawValue) && !isDataUrl(rawValue)) {
    skipped += 1;
    continue;
  }

  // Already public URL of journey-bites: normalize to storage path only.
  const normalizedPath = extractJourneyBitesPathFromUrl(rawValue);
  if (normalizedPath) {
    if (normalizedPath === rawValue) {
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY-RUN] Normalize ${id}: ${rawValue} -> ${normalizedPath}`);
      normalized += 1;
      continue;
    }

    const { error } = await supabase
      .from("journey_bites")
      .update({ photo_path: normalizedPath })
      .eq("id", id);

    if (error) {
      failed += 1;
      console.error(`[FAIL] Normalize ${id}: ${error.message}`);
    } else {
      normalized += 1;
      console.log(`[OK] Normalized ${id}`);
    }

    continue;
  }

  try {
    let payload;
    if (isDataUrl(rawValue)) {
      const parsed = parseDataUrl(rawValue);
      if (!parsed) {
        throw new Error("Invalid data URL format");
      }
      payload = parsed;
    } else {
      payload = await fetchRemoteImage(rawValue);
    }

    const destinationPath = createDestinationPath(id, payload.ext);

    if (DRY_RUN) {
      console.log(`[DRY-RUN] Migrate ${id}: ${rawValue} -> ${destinationPath}`);
      migrated += 1;
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(destinationPath, payload.buffer, {
        contentType: payload.mime || contentTypeFromExt(payload.ext),
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { error: updateError } = await supabase
      .from("journey_bites")
      .update({ photo_path: destinationPath })
      .eq("id", id);

    if (updateError) {
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    migrated += 1;
    console.log(`[OK] Migrated ${id} -> ${destinationPath}`);
  } catch (error) {
    failed += 1;
    console.error(`[FAIL] ${id}: ${error.message}`);
  }
}

console.log("\nMigration summary:");
console.log(`- Migrated: ${migrated}`);
console.log(`- Normalized: ${normalized}`);
console.log(`- Skipped: ${skipped}`);
console.log(`- Failed: ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
