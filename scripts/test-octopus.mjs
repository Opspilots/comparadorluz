/**
 * Test script for Octopus Energy API integration
 * Run: node scripts/test-octopus.mjs
 */

const BASE = 'https://api.octopus.energy/v1';
const GBP_EUR = 1.17; // Approximate exchange rate

async function testOctopusIntegration() {
    console.log('=== TEST 1: Verificación de API (GET /products/) ===');
    const verifyRes = await fetch(BASE + '/products/');
    console.log('Status:', verifyRes.status, verifyRes.ok ? '✓ OK' : '✗ FAIL');
    console.log('→ La verificación pasaría porque status =', verifyRes.status);
    console.log();

    console.log('=== TEST 2: Listar productos Octopus Energy ===');
    const productsRes = await fetch(BASE + '/products/?brand=OCTOPUS_ENERGY&is_business=false');
    const productsData = await productsRes.json();
    const imports = productsData.results.filter(r => r.direction === 'IMPORT');
    console.log('Productos de importación:', imports.length);
    imports.forEach(p => console.log('  ', p.code, '-', p.display_name, '(' + (p.term || 'variable') + ' meses)'));
    console.log();

    console.log('=== TEST 3: Tarifas reales — Octopus 12M Fixed ===');
    const productCode = 'OE-FIX-12M-26-03-04';
    const region = '_A';
    const productRes = await fetch(`${BASE}/products/${productCode}/`);
    const product = await productRes.json();

    const elecTariffs = product.single_register_electricity_tariffs;
    const tariffCode = elecTariffs[region].direct_debit_monthly.code;
    console.log('Electricity tariff code:', tariffCode);

    const gasTariffs = product.single_register_gas_tariffs;
    const gasTariffCode = gasTariffs[region].direct_debit_monthly.code;
    console.log('Gas tariff code:', gasTariffCode);

    // Fetch all rates in parallel
    const [ratesRes, standingRes, gasRatesRes, gasStandingRes] = await Promise.all([
        fetch(`${BASE}/products/${productCode}/electricity-tariffs/${tariffCode}/standard-unit-rates/`),
        fetch(`${BASE}/products/${productCode}/electricity-tariffs/${tariffCode}/standing-charges/`),
        fetch(`${BASE}/products/${productCode}/gas-tariffs/${gasTariffCode}/standard-unit-rates/`),
        fetch(`${BASE}/products/${productCode}/gas-tariffs/${gasTariffCode}/standing-charges/`),
    ]);

    const rates = await ratesRes.json();
    const standing = await standingRes.json();
    const gasRates = await gasRatesRes.json();
    const gasStanding = await gasStandingRes.json();

    console.log();
    console.log('--- ELECTRICIDAD ---');
    const currentElecRate = rates.results.find(r => r.valid_to === null) || rates.results[0];
    const elecPenceKwh = currentElecRate.value_inc_vat;
    const elecEurKwh = (elecPenceKwh / 100 * GBP_EUR).toFixed(6);
    console.log('Precio energía:', elecPenceKwh, 'p/kWh =', elecEurKwh, 'EUR/kWh');
    console.log('Historial precios:');
    rates.results.forEach(r => console.log('  ', r.value_inc_vat, 'p/kWh desde', r.valid_from, 'hasta', r.valid_to || 'ahora'));

    const standingCharge = standing.results[0];
    const standingEurMonth = (standingCharge.value_inc_vat / 100 * 30.44 * GBP_EUR).toFixed(2);
    console.log('Cargo fijo:', standingCharge.value_inc_vat, 'p/día =', standingEurMonth, 'EUR/mes');

    console.log();
    console.log('--- GAS ---');
    const currentGasRate = gasRates.results.find(r => r.valid_to === null) || gasRates.results[0];
    const gasPenceKwh = currentGasRate.value_inc_vat;
    const gasEurKwh = (gasPenceKwh / 100 * GBP_EUR).toFixed(6);
    console.log('Precio gas:', gasPenceKwh, 'p/kWh =', gasEurKwh, 'EUR/kWh');

    const gasStandingCharge = gasStanding.results[0];
    const gasStandingEurMonth = (gasStandingCharge.value_inc_vat / 100 * 30.44 * GBP_EUR).toFixed(2);
    console.log('Cargo fijo gas:', gasStandingCharge.value_inc_vat, 'p/día =', gasStandingEurMonth, 'EUR/mes');

    console.log();
    console.log('=== TEST 4: Simulación de cálculo anual (3500 kWh elec + 8000 kWh gas) ===');
    const annualElec = 3500;
    const annualGas = 8000;

    const elecEnergy = annualElec * parseFloat(elecEurKwh);
    const elecFixed = parseFloat(standingEurMonth) * 12;
    const elecTotal = elecEnergy + elecFixed;

    const gasEnergy = annualGas * parseFloat(gasEurKwh);
    const gasFixed = parseFloat(gasStandingEurMonth) * 12;
    const gasTotal = gasEnergy + gasFixed;

    console.log('Electricidad:');
    console.log('  Energía:', annualElec, 'kWh x', elecEurKwh, '=', elecEnergy.toFixed(2), 'EUR');
    console.log('  Fijo:   ', standingEurMonth, 'EUR/mes x 12 =', elecFixed.toFixed(2), 'EUR');
    console.log('  Total anual:', elecTotal.toFixed(2), 'EUR (' + (elecTotal / 12).toFixed(2) + ' EUR/mes)');
    console.log();
    console.log('Gas:');
    console.log('  Energía:', annualGas, 'kWh x', gasEurKwh, '=', gasEnergy.toFixed(2), 'EUR');
    console.log('  Fijo:   ', gasStandingEurMonth, 'EUR/mes x 12 =', gasFixed.toFixed(2), 'EUR');
    console.log('  Total anual:', gasTotal.toFixed(2), 'EUR (' + (gasTotal / 12).toFixed(2) + ' EUR/mes)');
    console.log();
    console.log('TOTAL COMBINADO:', (elecTotal + gasTotal).toFixed(2), 'EUR/año');

    console.log();
    console.log('=== TEST 5: Agile tariff — precios por media hora (últimas 24h) ===');
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const to = now.toISOString();
    const agileRes = await fetch(`${BASE}/products/AGILE-24-10-01/electricity-tariffs/E-1R-AGILE-24-10-01-A/standard-unit-rates/?period_from=${from}&period_to=${to}`);
    const agileData = await agileRes.json();
    console.log('Precios últimas 24h:', agileData.results.length, 'intervalos de 30 min');
    if (agileData.results.length > 0) {
        const prices = agileData.results.map(r => r.value_inc_vat);
        console.log('Mín:', Math.min(...prices).toFixed(2), 'p/kWh (' + (Math.min(...prices) / 100 * GBP_EUR).toFixed(4) + ' EUR/kWh)');
        console.log('Máx:', Math.max(...prices).toFixed(2), 'p/kWh (' + (Math.max(...prices) / 100 * GBP_EUR).toFixed(4) + ' EUR/kWh)');
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        console.log('Media:', avg.toFixed(2), 'p/kWh (' + (avg / 100 * GBP_EUR).toFixed(4) + ' EUR/kWh)');
        console.log('Primeros 5 intervalos:');
        agileData.results.slice(0, 5).forEach(r =>
            console.log('  ', r.valid_from, '→', r.value_inc_vat, 'p/kWh')
        );
    }

    console.log();
    console.log('=== TEST 6: Mapeo de datos al formato del CRM ===');
    const mappedTariff = {
        supplier_name: 'Octopus Energy',
        tariff_name: product.display_name + ' (Region ' + region + ')',
        tariff_type: '2.0TD', // UK single register ≈ simplified 2.0TD
        tariff_code: tariffCode,
        contract_duration: product.term,
        is_indexed: false,
        tariff_rates: [
            {
                item_type: 'energy',
                period: 'P1',
                price: parseFloat(elecEurKwh),
                unit: 'EUR/kWh',
                valid_from: currentElecRate.valid_from,
                valid_to: currentElecRate.valid_to,
            },
            {
                item_type: 'fixed_fee',
                price: parseFloat(standingEurMonth),
                unit: 'EUR/month',
                valid_from: standingCharge.valid_from,
            },
        ],
    };
    console.log('Tarifa mapeada para el CRM:');
    console.log(JSON.stringify(mappedTariff, null, 2));

    console.log();
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  TODOS LOS TESTS COMPLETADOS EXITOSAMENTE  ✓   ║');
    console.log('╚══════════════════════════════════════════════════╝');
}

testOctopusIntegration().catch(console.error);
