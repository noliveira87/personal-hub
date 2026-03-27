import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const SOCIAL_MEDIA_NOTE_PREFIX = "KIND:social_media";

const rawData = String.raw`WhatYouExpect	Vale	Surveys	13/03/2026		-	-	5.00€
Amazon	LetyShops	Cashback	11/03/2026	-	-	-	6.20€
Amazon	Bleap	Cashback	10/03/2026	-	-	$1.41	1.24€
beRuby	PayPal	Surveys	09/03/2026	-	-	-	10.00€
Unibanco	Unibanco	Cashback	07/03/2026		-	-	20.00€
Continente	Curve	Cashback	07/03/2026	-	-	£0.21	0.25€
Bagga	Curve	Cashback	07/03/2026	-	-	£0.04	0.05€
Continente	Curve	Cashback	06/03/2026	-	-	£1.35	1.59€
WhatYouExpect	Vale	Surveys	05/03/2026		-	-	5.00€
MEO	Curve	Cashback	04/03/2026	-	-	£2.11	2.49€
Amazon	LetyShops	Cashback	03/03/2026	-	-	-	0.26€
EarnStar	PayPal	Surveys	28/02/2026	-	-	-	1.64€
PrimeOpinion	Revolut	Surveys	28/02/2026	-	-	-	3.00€
AttaPoll	PayPal	Surveys	28/02/2026	-	-	-	9.05€
Amazon	LetyShops	Cashback	28/02/2026	-	-	-	0.02€
Amazon	LetyShops	Cashback	28/02/2026	-	-	-	2.69€
MEO	Curve	Cashback	25/02/2026	-	-	£0.36	0.42€
Frango e Vicios	Cetelem	Cashback	21/02/2026	-	19.21€	-	0.58€
LIDL	Cetelem	Cashback	21/02/2026	-	8.95€	-	0.27€
LIDL	Curve	Cashback	20/02/2026	-	-	£0.08	0.09€
Continente	Curve	Cashback	20/02/2026	-	-	£0.87	1.03€
A Batina	Cetelem	Cashback	19/02/2026	-	25.00€	-	0.75€
Ivo Macedo Lisboa Luz	Cetelem	Cashback	18/02/2026	-	14.00€	-	0.42€
Amazon	LetyShops	Cashback	15/02/2026	-	-	-	6.95€
Continente	Curve	Cashback	14/02/2026	-	-	£0.33	0.39€
Mercadona	Cetelem	Cashback	14/02/2026	-	38.35€	-	1.15€
Frangos e Vicios	Cetelem	Cashback	14/02/2026	-	19.34€	-	0.58€
Continente	Cetelem	Cashback	13/02/2026	-	42.38€	-	1.27€
Prozis	Cetelem	Cashback	13/02/2026	-	67.43€	-	2.02€
Vitaminas	Cetelem	Cashback	13/02/2026	-	3.50€	-	0.11€
Companhia das Sandes	Cetelem	Cashback	13/02/2026	-	6.50€	-	0.20€
LaoLao	Cetelem	Cashback	13/02/2026	-	4.90€	-	0.15€
Vitaminas	Cetelem	Cashback	13/02/2026	-	10.45€	-	0.31€
Sabores e Mondego	Cetelem	Cashback	13/02/2026	-	10.10€	-	0.30€
LaoLao	Cetelem	Cashback	13/02/2026	-	4.90€	-	0.15€
Legumes e Outros Vicios	Cetelem	Cashback	13/02/2026	-	36.75€	-	1.10€
Continente	Cetelem	Cashback	13/02/2026	-	24.19€	-	0.73€
Continente	Cetelem	Cashback	13/02/2026	-	9.78€	-	0.29€
Pingo Doce	Cetelem	Cashback	13/02/2026	-	5.66€	-	0.17€
Continente	Cetelem	Cashback	13/02/2026	-	24.10€	-	0.72€
Continente	Cetelem	Cashback	13/02/2026	-	20.31€	-	0.61€
Continente	Cetelem	Cashback	13/02/2026	-	2.87€	-	0.09€
Unibanco	Unibanco	Cashback	08/02/2026		-	-	20.00€
Coupert	Vale	Surveys	31/12/2025		-	-	4.87€
Bybit	ByBit	Cashback	04/02/2026		-	-	25.00€
Continente	Curve	Cashback	01/02/2026	-	-	£0.09	0.11€
Top Surveys	PayPal	Surveys	31/01/2026	-	-	-	1.00€
PrimeOpinion	Revolut	Surveys	31/01/2026	-	-	-	3.00€
MultiPolls	PayPal	Surveys	31/01/2026	-	-	-	7.00€
EarnStar	PayPal	Surveys	31/01/2026	-	-	-	4.00€
Continente	Curve	Cashback	30/01/2026	-	-	£0.21	0.25€
Bybit	ByBit	Cashback	26/01/2026		-	-	25.00€
Continente	Curve	Cashback	23/01/2026	-	-	£0.60	0.71€
Plenitude	TB	Others	20/01/2026	-	-	-	40.00€
Booking	Curve	Cashback	19/01/2026	-	-	£0.50	0.59€
Booking	Curve	Cashback	19/01/2026	-	-	£3.00	3.54€
Bybit	ByBit	Cashback	19/01/2026		-	-	25.00€
Leroy Merlin	Curve	Cashback	18/01/2026	-	-	£0.05	0.06€
Questionários Online	Vale	Surveys	16/01/2026	-	-	-	10.00€
Radar Consumo	Vale	Others	16/01/2026	-	-	-	5.00€
IKEA	Curve	Cashback	15/01/2026	-	-	£0.28	0.33€
Leroy Merlin	Curve	Cashback	11/01/2026	-	-	£0.01	0.01€
Continente	Curve	Cashback	09/01/2026	-	-	£0.54	0.64€
WhatYouExpect	Vale	Surveys	09/01/2026		-	-	5.00€
WhatYouExpect	Vale	Surveys	09/01/2026		-	-	5.00€
Unibanco	Unibanco	Cashback	08/01/2026		-	-	5.00€
Bybit	ByBit	Cashback	07/01/2026		-	-	25.00€
Bybit	ByBit	Cashback	07/01/2026		-	-	25.00€
Amazon	LetyShops	Cashback	07/01/2026	-	-	-	0.63€
Amazon	LetyShops	Cashback	07/01/2026	-	-	-	2.24€
Mercadona	Curve	Cashback	04/01/2026	-	-	£0.23	0.27€
beRuby	PayPal	Surveys	02/01/2026	-	-	-	10.00€
MultiPolls	PayPal	Surveys	31/12/2025	-	-	-	7.00€
Coupert	Vale	Surveys	31/12/2025		-	-	6.00€
Top Surveys	PayPal	Surveys	31/12/2025	-	-	-	1.00€
HeyCash	PayPal	Surveys	31/12/2025	-	-	-	1.00€
AttaPoll	PayPal	Surveys	31/12/2025	-	-	-	14.55€
EarnStar	PayPal	Surveys	31/12/2025	-	-	-	37.00€
Amazon	Curve	Cashback	30/12/2025	-	-	£0.51	0.60€
Booking	Curve	Cashback	29/12/2025	-	-	£1.92	2.27€
Leroy Merlin	Curve	Cashback	28/12/2025	-	-	£0.09	0.11€
Leroy Merlin	Curve	Cashback	27/12/2025	-	-	£0.06	0.07€
YouTube	Revolut	Others	23/12/2025	-	-	-	5.00€
WFP	Curve	Cashback	20/12/2025	-	-	£1.22	1.44€
Unibanco	Vale	Others	18/12/2025	-	-	-	40.00€
Radar Consumo	Vale	Others	18/12/2025	-	-	-	10.00€
Radar Consumo	Vale	Others	18/12/2025	-	-	-	10.00€
Continente	Curve	Cashback	18/12/2025	-	-	£0.07	0.08€
Bybit	ByBit	Cashback	17/12/2025		-	-	25.00€
Bybit	ByBit	Cashback	17/12/2025		-	-	25.00€
Continente	Curve	Cashback	16/12/2025	-	-	£0.07	0.08€
Amazon	LetyShops	Cashback	14/12/2025	-	-	-	4.83€
Amazon	LetyShops	Cashback	14/12/2025	-	-	-	11.54€
Continente	Curve	Cashback	12/12/2025	-	-	£0.43	0.51€
Amazon	Curve	Cashback	11/12/2025	-	-	£1.55	1.83€
Bybit	ByBit	Cashback	09/12/2025		-	-	25.00€
Mercadona	Curve	Cashback	05/12/2025	-	-	£0.18	0.21€
AC Hotel by Marriott Bella Sky Copenhagen	Curve	Cashback	04/12/2025	-	-	£5.51	6.50€
Amazon	LetyShops	Cashback	04/12/2025	-	-	-	0.81€
Amazon	LetyShops	Cashback	04/12/2025	-	-	-	14.81€
Bybit	ByBit	Cashback	02/12/2025		-	-	25.00€
EarnStar	PayPal	Surveys	30/11/2025	-	-	-	8.32€
Coupert	Vale	Surveys	30/11/2025		-	-	10.00€
Top Surveys	PayPal	Surveys	30/11/2025	-	-	-	2.00€
PrimeOpinion	Revolut	Surveys	30/11/2025	-	-	-	2.00€
HeyCash	PayPal	Surveys	30/11/2025	-	-	-	3.00€
AttaPoll	PayPal	Surveys	30/11/2025	-	-	-	14.02€
TikTok	Revolut	Others	30/11/2025	-	-	-	5.00€
beRuby	PayPal	Surveys	30/11/2025	-	-	-	10.00€
Bybit	ByBit	Cashback	28/11/2025		-	-	25.00€
Bybit	ByBit	Cashback	24/11/2025		-	-	25.00€
Bybit	ByBit	Cashback	24/11/2025		-	-	25.00€
Bybit	ByBit	Cashback	24/11/2025		-	-	25.00€
Bybit	ByBit	Cashback	24/11/2025		-	-	25.00€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	0.14€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	1.43€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	0.95€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	0.63€
Amazon	LetyShops	Cashback	22/11/2025	-	-	-	0.52€
TikTok	Revolut	Others	21/11/2025	-	-	-	10.00€
YouTube	Vale	Others	17/11/2025	-	-	-	8.00€
WhatYouExpect	Vale	Surveys	07/11/2025		-	-	5.00€
WhatYouExpect	Vale	Surveys	04/11/2025		-	-	5.00€
AttaPoll - Piti	PayPal	Surveys	22/12/2023	-	-	-	3.30€
AttaPoll	PayPal	Surveys	22/12/2023	-	-	-	3.21€
AttaPoll	PayPal	Surveys	21/12/2023	-	-	-	4.02€
AttaPoll	PayPal	Surveys	20/12/2023	-	-	-	3.03€
AttaPoll - Piti	PayPal	Surveys	15/12/2023	-	-	-	5.13€
AttaPoll	PayPal	Surveys	15/12/2023	-	-	-	3.19€
Santander	TB	Cashback	15/12/2023	-	-	-	9.84€
AttaPoll	PayPal	Surveys	14/12/2023	-	-	-	3.40€
AttaPoll	PayPal	Surveys	13/12/2023	-	-	-	3.28€
AttaPoll	PayPal	Surveys	04/12/2023	-	-	-	3.63€
MBWay	TB	Cashback	02/12/2023	-	-	-	10€
AttaPoll	PayPal	Surveys	23/11/2023	-	-	-	3.08€
Deco+	PayPal	Cashback	23/11/2023	-	-	-	8€
Santander	TB	Cashback	15/11/2023	-	-	-	16.75€
AttaPoll	PayPal	Surveys	17/10/2023	-	-	-	3.12€
Santander	TB	Cashback	15/10/2023	-	-	-	17.28€
Poll Pay	PayPal	Surveys	13/10/2023	-	-	-	10€
AttaPoll - Piti	PayPal	Surveys	07/10/2023	-	-	-	3.22€
AttaPoll	PayPal	Surveys	06/10/2023	-	-	-	3.40€
Santander	TB	Cashback	15/09/2023	-	-	-	16.57€
AttaPoll	PayPal	Surveys	11/09/2023	-	-	-	3.12€
AttaPoll	PayPal	Surveys	25/08/2023	-	-	-	3.24€
Santander	TB	Cashback	15/08/2023	-	-	-	14.81€
Nicequest	Vale	Surveys	07/08/2023	-	-	-	25€
Santander	TB	Cashback	15/07/2023	-	-	-	11.62€
AttaPoll	PayPal	Surveys	04/07/2023	-	-	-	3.09€
Santander	TB	Cashback	15/06/2023	-	-	-	7.93€
AttaPoll	PayPal	Surveys	05/06/2023	-	-	-	3.35€
Poll Pay	PayPal	Surveys	29/05/2023	-	-	-	10€
beRuby	PayPal	Surveys	29/05/2023	-	-	-	100€
Toluna	Vale	Surveys	26/05/2023	-	-	-	5€
Santander	TB	Cashback	15/05/2023	-	-	-	17.72€
Santander	TB	Cashback	04/05/2023	-	-	-	5.06€
`;

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
  console.log(`No new earnings to import. Parsed ${parsedRows.length} unique rows, all already exist in DB.`);
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

console.log(`✅ Imported ${toInsert.length} new earnings (${parsedRows.length} unique rows parsed).`);
console.log("📊 Parsed rows by year:", countByYear);
console.log("📊 New rows inserted by year:", toInsert.reduce((acc, row) => {
  const year = row.date.slice(0, 4);
  acc[year] = (acc[year] ?? 0) + 1;
  return acc;
}, {}));
