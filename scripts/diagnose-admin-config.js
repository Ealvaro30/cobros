const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    if (line.trim().startsWith('#') || !line.trim()) return;
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
    }
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('--- BUCKET META ---');
  const { data: bMeta, error: bErr } = await supabase.from('bucket_meta').select('*');
  if (bErr) console.error(bErr);
  else console.log(JSON.stringify(bMeta, null, 2));

  console.log('--- COMMISSION RATES ---');
  const { data: cRates, error: cErr } = await supabase.from('commission_rates').select('*');
  if (cErr) console.error(cErr);
  else console.log(JSON.stringify(cRates, null, 2));

  console.log('--- CLIENT STATES ---');
  const { data: cStates, error: sErr } = await supabase.from('client_states').select('*');
  if (sErr) console.error(sErr);
  else console.log(JSON.stringify(cStates, null, 2));
}

main().catch(console.error);
