import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhnnkvvzgrghwiaytioz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobm5rdnZ6Z3JnaHdpYXl0aW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTM1OTEsImV4cCI6MjA4NTY4OTU5MX0.2oQX4w-dzBook5-R05oi4AnCHO38xyi5mCZZyAh1gTg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConstraints() {
    try {
        console.log("Supabase direct SQL is not available from PostgREST, so I will analyze via RPC or existing migrations.");

        // Let's test what happens if we insert two versions with different durations but same valid_from
        // We can't insert properly without all foreign keys.

        // Let's fetch some existing tariffs to see what they look like
        const { data: versions, error: vError } = await supabase
            .from('tariff_versions')
            .select('id, tariff_name, valid_from, valid_to, contract_duration, supplier_id, tariff_rates(contract_duration, valid_from, valid_to, item_type)')
            .limit(5);

        console.log("Sample Tariffs:", JSON.stringify(versions, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

checkConstraints();
