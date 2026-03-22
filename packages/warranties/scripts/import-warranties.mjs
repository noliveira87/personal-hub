import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RAW_DATA = `Sony - PS4\tJumbo BOX\t12/10/2018\t299.00€\t2716\tSem Garantia
Benq - GW2780\tTrifida\t03/01/2019\t0.00€\t2633\tSem Garantia
Xiaomi - Balança Digital\tFNAC\t08/02/2019\t34.99€\t2597\tSem Garantia
Xiaomi - Roborock S5\tTrifida\t20/09/2019\t410.00€\t2373\tSem Garantia
Polaroid OneStep 2\tAmazon\t26/11/2019\t100.64\t2306\tSem Garantia
MEI - Desumidificador\tTrifida/Worten\t17/01/2020\t169.99€\t2254\tSem Garantia
Silvercrest - Tostadeira\tLIDL\t22/06/2020\t29.99€\t2097\tSem Garantia
Hawkers - Óculos Sol Quica\tHawkers\t24/06/2020\t25.00€\t2095\tSem Garantia
Hawkers - Óculos Sol Nuno\tHawkers\t24/06/2020\t25.00€\t2095\tSem Garantia
Silvercrest - Ferro Engomar\tLIDL\t26/07/2020\t9.99€\t2063\tSem Garantia
Flama - Liquidificador\tPingo Doce\t06/08/2020\t25.93€\t2052\tSem Garantia
Silvercrest - Secador\tLIDL\t10/08/2020\t19.99€\t2048\tSem Garantia
Dreame V9P - Gertrudes\tDHgate\t11/08/2020\t124.47€\t2047\tSem Garantia
Silvercrest - Varinha\tLIDL\t24/08/2020\t9.99€\t2034\tSem Garantia
Silvercrest - Chaleira\tLIDL\t24/08/2020\t22.99€\t2034\tSem Garantia
ORIMA - Arca Congeladora\tCinogaz\t21/09/2020\t146.85€\t2006\tSem Garantia
Silvercrest - Robô Cozinha\tLIDL\t01/10/2020\t19.99€\t1996\tSem Garantia
Silvercrest - Secador Toalhas\tLIDL\t19/10/2020\t39.99€\t1978\tSem Garantia
iPhone 12 Quica\tFNAC\t01/04/2021\t0.00€\t1814\tSem Garantia
Benq - GW2780\tPCDiga\t05/05/2021\t0.00€\t1780\tSem Garantia
Pingo Doce - Máquina Café\tPingo Doce\t02/06/2021\t20.24€\t1752\tSem Garantia
Delonghi Magnifica\tWorten\t29/06/2022\t0.00€\t1360\tSem Garantia
Ferro Rowenta\tWorten\t13/07/2022\t0.00€\t1346\tSem Garantia
Varinha Bosch\tWorten\t13/07/2022\t0.00€\t1346\tSem Garantia
Torradeira Ariete\tWorten\t13/07/2022\t0.00€\t1346\tSem Garantia
Batedeira Bosch\tWorten\t13/07/2022\t0.00€\t1346\tSem Garantia
Liquidificador Ariete\tWorten\t13/07/2022\t0.00€\t1346\tSem Garantia
Limpa Vidros Severin\tWorten\t13/07/2022\t0.00€\t1346\tSem Garantia
Espremedor Ariete\tWorten\t13/07/2022\t0.00€\t1346\tSem Garantia
Fujifilme Instax Mini\tWorten\t22/11/2022\t94.99€\t1214\tSem Garantia
Carregador Dupla Wifi\tWorten\t18/12/2022\t0.00€\t1188\tSem Garantia
AirFryer\tPingo Doce\t31/08/2023\t0.00€\t932\tGarantia
Benq - GW2780\tPCDiga\t04/05/2024\t129.00€\t685\tGarantia
Máquina Lavar/Secar Candy\tWorten\t02/06/2024\t563.00€\t656\tGarantia
Switch D-Link 1000M\tWorten\t02/06/2024\t13.00€\t656\tGarantia
Ar Condicionado Midea Breezeless\tTClima\t27/06/2024\t899.00€\t631\tGarantia
Máquina Café Ariete\tCastro Electrónica\t13/12/2024\t0.00€\t462\tGarantia
Box Xiaomi TV S\tCastro Electrónica\t13/01/2025\t49.88€\t431\tGarantia
Pen USB PNY Attach 32GB\tWorten\t22/01/2025\t8.99€\t422\tGarantia
2x Shelly Plus 2PM / 2x Shelly 1PM Mini\tMauser\t21/02/2025\t60.00€\t392\tGarantia
Máquina Café Krups Sensation\tElectrocortes\t05/03/2025\t379.00€\t380\tGarantia
2x Shelly Plus 1 / 1x Shelly Plus 2PM\tMauser\t20/03/2025\t53.96€\t365\tGarantia
3x Reolink Argus Series B320\tMauser\t13/06/2025\t136.56€\t280\tGarantia
Shelly 2PM Gen3 / Shelly Plus Add-on\tMauser\t13/06/2025\t32.11€\t280\tGarantia
2x Reolink Argus Series B320\tMauser\t30/07/2025\t111.98€\t233\tGarantia
Shelly BLU Motion Sensor\tMauser\t12/08/2025\t18.30€\t220\tGarantia
1x Reolink Argus Series B320\tMauser\t22/08/2025\t55.99€\t210\tGarantia
1x Reolink Argus Series B320\tMauser\t28/08/2025\t55.99€\t204\tGarantia
Bateria HP 255\tTrifida\t29/08/2025\t36.29€\t203\tGarantia
Iphone 17 Quica\tAmazon\t28/09/2025\t0.00€\t173\tGarantia
EZVIZ CP5\tAmazon\t24/10/2025\t183.29€\t147\tGarantia
1x Reolink Argus Series B320\tMauser\t06/11/2025\t55.99€\t134\tGarantia
1x Reolink Argus Series B320 (Nocas)\tMauser\t06/11/2025\t55.99€\t134\tGarantia
1x Reolink Argus Series B320 (Nocas)\tMauser\t06/11/2025\t55.99€\t134\tGarantia
1x Reolink Argus Series B420\tMauser\t06/11/2025\t89.98€\t134\tGarantia
Shelly BLU Button\tMauser\t06/11/2025\t12.50€\t134\tGarantia
Shelly BLU Motion Sensor\tMauser\t21/11/2025\t20.52€\t119\tGarantia
EATON UPS\tTrifida\t02/02/2026\t63.00€\t46\tGarantia
Aparafusador LIDL 20V\tLIDL\t23/01/2026\t24.99€\t56\tGarantia`;

function parseDatePtToIso(datePt) {
  const [dd, mm, yyyy] = datePt.split("/");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function addYears(isoDate, years) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function parsePrice(value) {
  if (!value) return null;
  const cleaned = value.replace(/€/g, "").replace(/\s/g, "").replace(/,/g, ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferCategory(productName) {
  const value = productName.toLowerCase();

  const techKeywords = [
    "iphone", "ps4", "benq", "xiaomi", "polaroid", "dreame", "instax", "carregador", "switch",
    "tv", "usb", "shelly", "reolink", "bateria", "ezviz", "ups", "hp", "box"
  ];

  const applianceKeywords = [
    "desumidificador", "tostadeira", "ferro", "liquidificador", "secador", "varinha", "chaleira", "arca",
    "robô cozinha", "toalhas", "máquina", "caf", "rowenta", "bosch", "ariete", "airfryer", "ar condicionado",
    "espremedor", "batedeira", "congeladora", "lavar", "secar"
  ];

  if (techKeywords.some((keyword) => value.includes(keyword))) return "tech";
  if (applianceKeywords.some((keyword) => value.includes(keyword))) return "appliances";
  return "others";
}

function mapLineToRow(line) {
  const columns = line.split("\t").map((part) => part.trim());
  if (columns.length < 6) return null;

  const [productName, purchasedFrom, purchaseDatePt, priceText, , warrantyText] = columns;
  const purchaseDate = parseDatePtToIso(purchaseDatePt);
  const warrantyYears = warrantyText.toLowerCase().includes("sem") ? 2 : 3;

  return {
    product_name: productName,
    category: inferCategory(productName),
    purchased_from: purchasedFrom || null,
    purchase_date: purchaseDate,
    warranty_years: warrantyYears,
    expiration_date: addYears(purchaseDate, warrantyYears),
    price: parsePrice(priceText),
    receipt_url: null,
  };
}

async function run() {
  const rows = RAW_DATA
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(mapLineToRow)
    .filter(Boolean);

  if (!rows.length) {
    console.log("No rows to import.");
    return;
  }

  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("warranties").insert(chunk);

    if (error) {
      console.error("Import failed on chunk", i / chunkSize + 1, error);
      process.exit(1);
    }

    console.log(`Imported ${Math.min(i + chunk.length, rows.length)}/${rows.length}`);
  }

  console.log(`Done. Imported ${rows.length} warranties.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
