
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lhnnkvvzgrghwiaytioz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobm5rdnZ6Z3JnaHdpYXl0aW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTM1OTEsImV4cCI6MjA4NTY4OTU5MX0.2oQX4w-dzBook5-R05oi4AnCHO38xyi5mCZZyAh1gTg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TARIFF_ID = '2931f82a-0076-4f3f-b48c-27672538b23e';

async function diagnose() {
    console.log(`🔍 Investigating Tariff ID: ${TARIFF_ID}`);

    // 1. Check Tariff Version
    const { data: tariff, error: tError } = await supabase
        .from('tariff_versions')
        .select('*')
        .eq('id', TARIFF_ID)
        .single();

    if (tError) {
        console.error("❌ Error fetching tariff version:", tError.message);
    } else {
        console.log("✅ Tariff Version Found:");
        console.log(JSON.stringify(tariff, null, 2));
    }

    // 2. Check ALL rates for this version
    const { data: rates, error: rError } = await supabase
        .from('tariff_rates')
        .select('*')
        .eq('tariff_version_id', TARIFF_ID);

    if (rError) {
        console.error("❌ Error fetching rates:", rError.message);
    } else {
        console.log(`\n📊 Found ${rates.length} rates for this version.`);
        if (rates.length > 0) {
            console.log("Unique Validity Keys in Rates:");
            const validityKeys = rates.map(r => `${r.valid_from || 'none'}_${r.valid_to || 'none'}`);
            console.log(JSON.stringify([...new Set(validityKeys)], null, 2));

            console.log("\nSample Rate (First one):");
            console.log(JSON.stringify(rates[0], null, 2));
        }
    }

    // 3. Check if there are OTHER versions for the same name/supplier
    if (tariff) {
        console.log("\n🔄 Checking for other versions of the same tariff name/supplier...");
        const { data: related, error: relError } = await supabase
            .from('tariff_versions')
            .select('id, tariff_name, valid_from, valid_to')
            .eq('tariff_name', tariff.tariff_name)
            .eq('supplier_id', tariff.supplier_id)
            .neq('id', TARIFF_ID);

        if (relError) console.error("relError", relError);
        else console.log(`Found ${related.length} other related versions.`);
    }

    // 4. Global Counts to verify DB connectivity
    const { count: vCount } = await supabase.from('tariff_versions').select('*', { count: 'exact', head: true });
    const { count: rCount } = await supabase.from('tariff_rates').select('*', { count: 'exact', head: true });
    console.log(`\n📈 Global Stats: Versions: ${vCount} | Rates: ${rCount}`);
}

diagnose();
