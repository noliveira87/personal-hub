import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PORTUGAL_REFORM_DATE = new Date("2022-01-01");

async function updateWarrantyYears() {
  console.log("Fetching all warranties...");
  const { data: warranties, error: fetchError } = await supabase
    .from("warranties")
    .select("id, purchase_date, warranty_years");

  if (fetchError) {
    console.error("Error fetching warranties:", fetchError);
    process.exit(1);
  }

  if (!warranties || warranties.length === 0) {
    console.log("No warranties found.");
    return;
  }

  console.log(`Found ${warranties.length} warranties. Updating based on purchase date...\n`);

  let updated = 0;
  let unchanged = 0;

  for (const warranty of warranties) {
    const purchaseDate = new Date(warranty.purchase_date);
    const shouldBe3Years = purchaseDate >= PORTUGAL_REFORM_DATE;
    const newYears = shouldBe3Years ? 3 : 2;

    if (warranty.warranty_years !== newYears) {
      const { error: updateError } = await supabase
        .from("warranties")
        .update({ warranty_years: newYears })
        .eq("id", warranty.id);

      if (updateError) {
        console.error(`Error updating warranty ${warranty.id}:`, updateError);
      } else {
        console.log(
          `✓ ID: ${warranty.id} | Date: ${warranty.purchase_date} | ${warranty.warranty_years} → ${newYears} years`
        );
        updated++;
      }
    } else {
      unchanged++;
    }
  }

  console.log(`\n✅ Update complete!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Unchanged: ${unchanged}`);
  console.log(`   Total: ${warranties.length}`);
}

updateWarrantyYears().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
