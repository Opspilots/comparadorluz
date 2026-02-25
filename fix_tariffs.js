
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhnnkvvzgrghwiaytioz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobm5rdnZ6Z3JnaHdpYXl0aW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTM1OTEsImV4cCI6MjA4NTY4OTU5MX0.2oQX4w-dzBook5-R05oi4AnCHO38xyi5mCZZyAh1gTg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixTariffs() {
    console.log("🚀 Starting Tariff Metadata Debug...");

    // 1. Check total count in tariff_rates
    const { count: ratesCount, error: rCountError } = await supabase
        .from('tariff_rates')
        .select('*', { count: 'exact', head: true });

    if (rCountError) {
        console.error("❌ Error counting rates:", rCountError);
    } else {
        console.log(`📊 Global Tariff Rates count: ${ratesCount}`);
    }

    // 2. Fetch some rates to see what ids they have
    const { data: sampleRates, error: sError } = await supabase
        .from('tariff_rates')
        .select('id, tariff_version_id, item_type')
        .limit(10);

    if (sError) {
        console.error("❌ Error fetching sample rates:", sError);
    } else {
        console.log("📋 Sample rates (first 10):", JSON.stringify(sampleRates, null, 2));
    }

    // 3. Fetch all versions
    const { data: versions, error: vError } = await supabase
        .from('tariff_versions')
        .select('id, tariff_name');

    if (vError) {
        console.error("❌ Error fetching versions:", vError);
    } else {
        console.log(`🔍 Found ${versions.length} tariff versions in DB.`);
        const vIds = versions.map(v => v.id);
        console.log("Version IDs in DB:", vIds);

        // Check if sample rates link to any of these
        if (sampleRates) {
            sampleRates.forEach(sr => {
                const match = vIds.includes(sr.tariff_version_id);
                console.log(`Rate ${sr.id} links to version ${sr.tariff_version_id}? ${match ? 'YES' : 'NO'}`);
            });
        }
    }
}

fixTariffs();
