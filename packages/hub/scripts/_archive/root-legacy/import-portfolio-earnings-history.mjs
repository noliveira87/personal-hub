import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const SOCIAL_MEDIA_NOTE_PREFIX = "KIND:social_media";
const rawDataPath = new URL("./import-portfolio-earnings-history.tsv", import.meta.url);
const rawData = await readFile(rawDataPath, "utf8");

const sanitizeRaw = (input) => input.replace(/€(?=[A-Za-zÀ-ÿ])/g, "€\n");

const parseEuroAmount = (value) => {
  const raw = String(value ?? "").replace(/\s/g, "").replace(/[€$£]/g, "");
  if (!raw) return NaN;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized = raw;
  if (hasComma && hasDot) {
    const decimalSeparator = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalized = raw.split(thousandSeparator).join("");
    if (decimalSeparator === ",") normalized = normalized.replace(",", ".");
  } else if (hasComma) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = raw.replace(/,/g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
};

const toIsoDate = (value) => {
  const [day, month, year] = String(value).split("/");
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const normalizeKind = (value) => {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "surveys") return "survey";
  if (normalized === "cashback") return "cashback";
  if (normalized === "others") return "social_media";
  return null;
};

const normalizeProvider = (value) => {
  const provider = String(value ?? "").trim();
  return provider || null;
};

const buildKey = ({ title, provider, kind, date, amountEur, notes }) =>
  `${title}__${provider || ""}__${kind}__${date}__${amountEur.toFixed(2)}__${notes || ""}`;

const deterministicId = (key) => `import-history-${createHash("sha1").update(key).digest("hex").slice(0, 16)}`;

const lines = sanitizeRaw(rawData)
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const parsedRows = [];
const seenInput = new Set();

for (const line of lines) {
  const columns = line.split("\t");
  if (columns.length < 4) continue;

  const [titleRaw, providerRaw, kindRaw, dateRaw] = columns;
  const title = String(titleRaw ?? "").trim();
  const provider = normalizeProvider(providerRaw);
  const normalizedKind = normalizeKind(kindRaw);
  const date = toIsoDate(dateRaw);
  const amountEur = parseEuroAmount(columns.at(-1));

  if (!title || !normalizedKind || !date || !Number.isFinite(amountEur)) {
    continue;
  }

  const notes = normalizedKind === "social_media" ? SOCIAL_MEDIA_NOTE_PREFIX : null;
  const dbKind = normalizedKind === "social_media" ? "survey" : normalizedKind;
  const key = buildKey({ title, provider, kind: dbKind, date, amountEur, notes });
  if (seenInput.has(key)) continue;
  seenInput.add(key);

  parsedRows.push({
    id: deterministicId(key),
    title,
    provider,
    kind: dbKind,
    date,
    amount_eur: amountEur,
    crypto_asset: null,
    crypto_units: null,
    spot_eur_at_earned: null,
    notes,
    created_at: new Date(`${date}T12:00:00.000Z`).toISOString(),
    updated_at: new Date().toISOString(),
    __key: key,
  });
}

const { data: existing, error: loadError } = await supabase
  .from("portfolio_earnings")
  .select("title, provider, kind, date, amount_eur, notes");

if (loadError) {
  console.error("Failed to load existing earnings:", loadError.message);
  process.exit(1);
}

const existingKeys = new Set(
  (existing ?? []).map((row) =>
    buildKey({
      title: String(row.title ?? "").trim(),
      provider: row.provider ? String(row.provider).trim() : null,
      kind: String(row.kind ?? "").trim(),
      date: String(row.date ?? "").trim(),
      amountEur: Number(row.amount_eur) || 0,
      notes: row.notes ? String(row.notes).trim() : null,
    }),
  ),
);

const toInsert = parsedRows
  .filter((row) => !existingKeys.has(row.__key))
  .map(({ __key, ...row }) => row);

if (!toInsert.length) {
  console.log(`No new earnings to import. Parsed ${parsedRows.length} unique rows.`);
  process.exit(0);
}

const { error: upsertError } = await supabase
  .from("portfolio_earnings")
  .upsert(toInsert, { onConflict: "id" });

if (upsertError) {
  console.error("Import failed:", upsertError.message);
  process.exit(1);
}

const countByYear = parsedRows.reduce((acc, row) => {
  const year = row.date.slice(0, 4);
  acc[year] = (acc[year] ?? 0) + 1;
  return acc;
}, {});

console.log(`Imported ${toInsert.length} new earnings (${parsedRows.length} unique rows parsed from paste).`);
console.log("Parsed rows by year:", countByYear);
