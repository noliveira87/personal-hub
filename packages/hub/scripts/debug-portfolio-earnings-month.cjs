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
  const month = process.argv[2] || '2026-03';
  const { data, error } = await supabase
    .from('portfolio_earnings')
    .select('date,kind,title,provider,amount_eur')
    .gte('date', `${month}-01`)
    .lt('date', `${month}-32`)
    .order('date', { ascending: true });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
})();
