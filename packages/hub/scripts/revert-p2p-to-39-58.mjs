#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function fixP2P() {
  console.log("🔧 Reverting P2P investment values...");
  console.log("   Setting: invested_amount = 515.95€, current_value = 555.53€ (gained 39.58€)");

  const { error } = await sb
    .from("portfolio_investments")
    .update({
      invested_amount: 515.95,
      current_value: 555.53,
      updated_at: new Date().toISOString(),
    })
    .eq("type", "p2p");

  if (error) {
    console.error("❌ Error updating P2P investment:", error);
    process.exit(1);
  }

  console.log("✅ P2P values reverted successfully!");
  process.exit(0);
}

fixP2P();
