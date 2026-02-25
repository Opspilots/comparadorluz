import fs from 'fs';

async function fetchSchema() {
    try {
        const response = await fetch('https://lhnnkvvzgrghwiaytioz.supabase.co/rest/v1/', {
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobm5rdnZ6Z3JnaHdpYXl0aW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTM1OTEsImV4cCI6MjA4NTY4OTU5MX0.2oQX4w-dzBook5-R05oi4AnCHO38xyi5mCZZyAh1gTg'
            }
        });
        const openapi = await response.json();

        fs.writeFileSync('schema_output.json', JSON.stringify({
            tariff_versions: Object.keys(openapi.definitions.tariff_versions.properties),
            tariff_rates: Object.keys(openapi.definitions.tariff_rates.properties)
        }, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

fetchSchema();
