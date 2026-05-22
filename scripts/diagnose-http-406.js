const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    if (line.trim().startsWith('#') || !line.trim()) return;
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      env[match[1]] = (match[2] || '').replace(/['"]/g, '').trim();
    }
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.7f064878-4ba8-44db-a725-0f056b297b09`;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Sending request to PostgREST...');
  console.log(`URL: ${url}`);

  // Test 1: Standard REST call (JSON array expected)
  const res1 = await fetch(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });
  console.log(`\n--- TEST 1 (Standard GET): Status ${res1.status} ---`);
  console.log('Headers:', Object.fromEntries(res1.headers.entries()));
  console.log('Body:', await res1.text());

  // Test 2: Single object call (which Next.js app does via .single())
  const res2 = await fetch(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Accept': 'application/vnd.pgrst.object+json'
    }
  });
  console.log(`\n--- TEST 2 (Accept: vnd.pgrst.object+json): Status ${res2.status} ---`);
  console.log('Headers:', Object.fromEntries(res2.headers.entries()));
  console.log('Body:', await res2.text());
}

main();
