import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const PREFIX = "PORTFOLIO_MOVEMENTS:";
const targetDate = "2026-02-28";
const updates = [
  { name: "XTB ETFs Nuno", amount: 13.06, id: "manual-backfill-20260228-xtb-nuno-contribution" },
  { name: "XTB ETFs Minina", amount: 55.44, id: "manual-backfill-20260228-xtb-minina-contribution" },
];

function parseMovements(notes) {
  if (!notes) return { movements: [], extraLines: [] };

  const lines = String(notes).split("\n");
  const movementLineIndex = lines.findIndex((line) => line.trim().startsWith(PREFIX));

  if (movementLineIndex === -1) {
    return { movements: [], extraLines: lines.filter(Boolean) };
  }

  const payload = lines[movementLineIndex].trim().slice(PREFIX.length).trim();
  let movements = [];

  try {
    movements = JSON.parse(payload);
  } catch {
    movements = [];
  }

  const extraLines = lines
    .filter((_, index) => index !== movementLineIndex)
    .filter((line) => line.trim().length > 0);

  return { movements: Array.isArray(movements) ? movements : [], extraLines };
}

function serializeNotes(movements, extraLines) {
  const header = movements.length ? `${PREFIX}${JSON.stringify(movements)}` : null;
  return [header, ...extraLines].filter(Boolean).join("\n") || null;
}

for (const item of updates) {
  const { data, error } = await supabase
    .from("portfolio_investments")
    .select("id,name,notes")
    .eq("name", item.name)
    .maybeSingle();

  if (error || !data) {
    console.error(`Failed to load ${item.name}:`, error?.message ?? "not found");
    process.exit(1);
  }

  const { movements, extraLines } = parseMovements(data.notes);
  const alreadyExists = movements.some((movement) => movement?.id === item.id);

  if (!alreadyExists) {
    movements.push({
      id: item.id,
      date: targetDate,
      kind: "contribution",
      amount: item.amount,
      note: "Historical backfill",
    });

    movements.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const { error: updateError } = await supabase
      .from("portfolio_investments")
      .update({
        notes: serializeNotes(movements, extraLines),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (updateError) {
      console.error(`Failed to update ${item.name}:`, updateError.message);
      process.exit(1);
    }
  }
}

const febInflow = updates.reduce((sum, item) => sum + item.amount, 0);
const { data: snapshot, error: snapshotError } = await supabase
  .from("portfolio_monthly_snapshots")
  .select("month,monthly_inflow")
  .eq("month", "2026-02")
  .maybeSingle();

if (snapshotError || !snapshot) {
  console.error("Failed to load Feb 2026 snapshot:", snapshotError?.message ?? "not found");
  process.exit(1);
}

const nextMonthlyInflow = Math.round((Number(snapshot.monthly_inflow || 0) + febInflow) * 100) / 100;
const { error: snapshotUpdateError } = await supabase
  .from("portfolio_monthly_snapshots")
  .update({
    monthly_inflow: nextMonthlyInflow,
    updated_at: new Date().toISOString(),
  })
  .eq("month", "2026-02");

if (snapshotUpdateError) {
  console.error("Failed to update Feb 2026 snapshot:", snapshotUpdateError.message);
  process.exit(1);
}

console.log(`Updated DB successfully. Added ${febInflow.toFixed(2)}€ of Feb 2026 contribution history and set 2026-02 monthly_inflow to ${nextMonthlyInflow.toFixed(2)}€.`);
