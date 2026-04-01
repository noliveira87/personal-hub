const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync(path.join(__dirname, '../../../.env.local'), 'utf8');
const vars = Object.fromEntries(
  env
    .split('\n')
    .filter((line) => line.trim() && line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const supabase = createClient(vars.VITE_SUPABASE_URL, vars.VITE_SUPABASE_ANON_KEY);

(async () => {
  const { data, error } = await supabase
    .from('portfolio_monthly_snapshots')
    .select('month,total_invested,total_current_value,monthly_inflow,monthly_performance,monthly_return_pct,updated_at')
    .order('month', { ascending: false })
    .limit(6);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
})();
