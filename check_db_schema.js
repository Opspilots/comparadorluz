import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhnnkvvzgrghwiaytioz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobm5rdnZ6Z3JnaHdpYXl0aW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTM1OTEsImV4cCI6MjA4NTY4OTU5MX0.2oQX4w-dzBook5-R05oi4AnCHO38xyi5mCZZyAh1gTg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    // We can query the information_schema using rpc if we had it, but without standard access we can just try to insert a fake record and catch the error, or query column names by requesting 1 row.
    const { data: versions, error: vError } = await supabase.from('tariff_versions').select('*').limit(1);
    const { data: rates, error: rError } = await supabase.from('tariff_rates').select('*').limit(1);

    console.log("Tariff Versions Columns:", versions ? Object.keys(versions[0] || {}).join(', ') : vError);
    console.log("Tariff Rates Columns:", rates ? Object.keys(rates[0] || {}).join(', ') : rError);
}

checkSchema();
