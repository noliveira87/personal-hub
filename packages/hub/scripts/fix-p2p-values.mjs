#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function fixP2PValues() {
  console.log("🔍 Fetching P2P investment and movements...");

  const { data: p2pInv, error: invError } = await sb
    .from("portfolio_investments")
    .select("id, name, notes, invested_amount, current_value")
    .eq("type", "p2p")
    .maybeSingle();

  if (invError || !p2pInv) {
    console.error("❌ Error loading P2P investment:", invError);
    process.exit(1);
  }

  console.log(`📊 Found P2P investment: ${p2pInv.name}`);
  console.log(`   Current DB values: invested=${p2pInv.invested_amount}€, current=${p2pInv.current_value}€`);

  // Parse movements from notes
  let movements = [];
  if (p2pInv.notes && p2pInv.notes.includes("PORTFOLIO_MOVEMENTS:")) {
    try {
      const match = p2pInv.notes.match(/PORTFOLIO_MOVEMENTS:(\[.*?\])/s);
      if (match) {
        movements = JSON.parse(match[1]);
      }
    } catch (e) {
      console.error("❌ Error parsing movements:", e.message);
      process.exit(1);
    }
  }

  console.log(`\n📝 Found ${movements.length} movements:`);

  // Calculate invested amount and gains from movements
  let additionalContributions = 0;
  let withdrawnAmount = 0;
  let gains = 0;

  movements.forEach((m) => {
    const isCapitalAmortization =
      m.kind === "withdrawal" && m.id === "goparity-2026-01-03-ajuste-amortizacao-capital";

    if (m.kind === "contribution") {
      additionalContributions += m.amount;
      console.log(`  ➕ ${m.date} contribution   +${m.amount.toFixed(2)}€  "${m.note}"`);
    } else if (m.kind === "adjustment") {
      gains += m.amount;
      console.log(`  💰 ${m.date} adjustment     +${m.amount.toFixed(2)}€  "${m.note}"`);
    } else if (m.kind === "withdrawal") {
      withdrawnAmount += m.amount;
      if (isCapitalAmortization) {
        console.log(`  🔄 ${m.date} capital amortz -${m.amount.toFixed(2)}€  "${m.note}"`);
      } else {
        console.log(`  ➖ ${m.date} withdrawal     -${m.amount.toFixed(2)}€  "${m.note}"`);
      }
    } else {
      console.log(`  - ${m.date} ${m.kind.padEnd(12)} ${m.amount >= 0 ? "+" : ""}${m.amount.toFixed(2)}€  "${m.note}"`);
    }
  });

  // Invested amount = current DB value + additional contributions - withdrawals (including capital amortization)
  const investedAmount = p2pInv.invested_amount + additionalContributions - withdrawnAmount;
  const currentValue = investedAmount + gains;

  console.log(`\n📊 Calculated values:`);
  console.log(`   Current DB invested: ${p2pInv.invested_amount.toFixed(2)}€`);
  console.log(`   Additional contributions: +${additionalContributions.toFixed(2)}€`);
  console.log(`   Withdrawals: -${withdrawnAmount.toFixed(2)}€`);
  console.log(`   → Invested Amount: ${investedAmount.toFixed(2)}€`);
  console.log(`   Gains (adjustments): +${gains.toFixed(2)}€`);
  console.log(`   → Current Value: ${currentValue.toFixed(2)}€`);

  console.log(`\n🔄 Comparison:`);
  console.log(`   DB invested_amount: ${p2pInv.invested_amount}€ → ${investedAmount.toFixed(2)}€ (${investedAmount - p2pInv.invested_amount >= 0 ? "+" : ""}${(investedAmount - p2pInv.invested_amount).toFixed(2)}€)`);
  console.log(`   DB current_value: ${p2pInv.current_value}€ → ${currentValue.toFixed(2)}€ (${currentValue - p2pInv.current_value >= 0 ? "+" : ""}${(currentValue - p2pInv.current_value).toFixed(2)}€)`);

  // Confirm and update
  const shouldUpdate =
    Math.abs(investedAmount - p2pInv.invested_amount) > 0.01 ||
    Math.abs(currentValue - p2pInv.current_value) > 0.01;

  if (!shouldUpdate) {
    console.log("\n✅ Values already match! No update needed.");
    process.exit(0);
  }

  console.log("\n⚠️  Values mismatch detected. Updating database...");

  const { error: updateError } = await sb
    .from("portfolio_investments")
    .update({
      invested_amount: parseFloat(investedAmount.toFixed(2)),
      current_value: parseFloat(currentValue.toFixed(2)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", p2pInv.id);

  if (updateError) {
    console.error("❌ Error updating P2P investment:", updateError);
    process.exit(1);
  }

  console.log("✅ P2P investment values updated successfully!");
  process.exit(0);
}

fixP2PValues();
