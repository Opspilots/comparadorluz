import { normalizeNumber } from '@/shared/lib/utils';


interface OcrData {
    customer_name?: any;
    cif?: any;
    supply_type?: any;
    atrr?: any;
    tariff_type?: any;
    annual_consumption?: any;
    contracted_power?: any;
    cups?: any;
    current_cost?: any;
    power_p1?: any;
    power_p2?: any;
    power_p3?: any;
    power_p4?: any;
    power_p5?: any;
    power_p6?: any;
    p1_consumption_pct?: any;
    p2_consumption_pct?: any;
    p3_consumption_pct?: any;
    p4_consumption_pct?: any;
    p5_consumption_pct?: any;
    p6_consumption_pct?: any;
    current_supplier?: any;
    conversion_factor?: any;
    billing_days?: any;
    billing_consumption_kwh?: any;
    [key: string]: any;
}

export interface MappedOcrData {
    customerName?: string;
    cif?: string;
    supplyType?: 'electricity' | 'gas';
    tariffType?: string;
    consumption?: string;
    power?: string;
    cups?: string;
    currentCost?: string;
    conversionFactor?: string;
    powerP1?: string;
    powerP2?: string;
    powerP3?: string;
    powerP4?: string;
    powerP5?: string;
    powerP6?: string;
    consP1?: string;
    consP2?: string;
    consP3?: string;
    consP4?: string;
    consP5?: string;
    consP6?: string;
    currentSupplier?: string;
}

function flattenObject(ob: any): any {
    var toReturn: any = {};
    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) continue;
        if ((typeof ob[i]) == 'object' && ob[i] !== null) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;
                toReturn[x] = flatObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}

function processRawData(rawData: any): OcrData {
    if (!rawData) return {};

    let parsedData = rawData;
    if (typeof rawData === 'string') {
        try {
            parsedData = JSON.parse(rawData);
        } catch (e) {
            console.error("Failed to parse stringified OCR data", e);
        }
    }

    let data = Array.isArray(parsedData) ? parsedData[0] : parsedData;
    if (data && typeof data === 'object') {
        data = flattenObject(data);
    }
    return data || {};
}

export function mapOcrData(rawData: any, suppliers: { id: string, name: string }[]): MappedOcrData {
    const data = processRawData(rawData);
    const updates: MappedOcrData = {};

    if (data.customer_name) updates.customerName = String(data.customer_name);
    if (data.cif) updates.cif = String(data.cif);

    const supplyTypeStr = String(data.supply_type || '').toLowerCase();
    const atrrStr = String(data.atrr || '').toUpperCase();
    const tariffTypeRaw = String(data.tariff_type || '').toUpperCase();

    // Supply Type Detection
    if (supplyTypeStr === 'gas' || atrrStr.includes('RL') || tariffTypeRaw.includes('RL')) {
        updates.supplyType = 'gas';
        // Set Conversion Factor: Use extracted if available
        if (data.conversion_factor) {
            updates.conversionFactor = normalizeNumber(data.conversion_factor);
        }
    } else {
        updates.supplyType = 'electricity';
        updates.conversionFactor = '';
    }

    if (data.tariff_type) {
        let t = tariffTypeRaw.replace(/\s/g, ''); // Remove spaces
        // Electricity
        if (t.includes('2.0') || t.includes('20TD')) t = '2.0TD';
        else if (t.includes('3.0') || t.includes('30TD')) t = '3.0TD';
        else if (t.includes('6.1')) t = '6.1TD';
        else if (t.includes('6.2')) t = '6.2TD';
        // Gas
        else if (t.includes('RL.1') || t.includes('RL1')) t = 'RL.1';
        else if (t.includes('RL.2') || t.includes('RL2')) t = 'RL.2';
        else if (t.includes('RL.3') || t.includes('RL3')) t = 'RL.3';
        else if (t.includes('RL.4') || t.includes('RL4') || t.includes('RL.4')) t = 'RL.4'; // RL.4 covers others usually in small consumers

        if (t !== '') updates.tariffType = t;
    }
    // Annual consumption: prefer annual_consumption, but extrapolate from billing period if needed
    if (data.annual_consumption) {
        const annualVal = parseFloat(normalizeNumber(data.annual_consumption));
        const billingDays = parseFloat(normalizeNumber(data.billing_days) || '0');
        const billingConsumption = parseFloat(normalizeNumber(data.billing_consumption_kwh) || '0');

        if (annualVal > 0) {
            // If annual_consumption looks like it's just the billing period value (too low),
            // and we have billing_days to extrapolate, do so
            if (billingDays > 0 && billingDays < 300 && billingConsumption > 0
                && Math.abs(annualVal - billingConsumption) < billingConsumption * 0.1) {
                // The AI returned billing consumption as annual — extrapolate
                const extrapolated = Math.round(billingConsumption * 365 / billingDays);
                updates.consumption = String(extrapolated);
            } else {
                updates.consumption = normalizeNumber(data.annual_consumption);
            }
        }
    } else if (data.billing_consumption_kwh && data.billing_days) {
        // No annual given, extrapolate from billing period
        const billingDays = parseFloat(normalizeNumber(data.billing_days) || '0');
        const billingConsumption = parseFloat(normalizeNumber(data.billing_consumption_kwh) || '0');
        if (billingDays > 0 && billingConsumption > 0) {
            const extrapolated = Math.round(billingConsumption * 365 / billingDays);
            updates.consumption = String(extrapolated);
        }
    }
    if (data.contracted_power) updates.power = normalizeNumber(data.contracted_power);
    if (data.cups) updates.cups = String(data.cups);
    if (data.current_cost) updates.currentCost = normalizeNumber(data.current_cost);

    // Map power periods
    if (data.power_p1) updates.powerP1 = normalizeNumber(data.power_p1);
    if (data.power_p2) updates.powerP2 = normalizeNumber(data.power_p2);
    if (data.power_p3) updates.powerP3 = normalizeNumber(data.power_p3);
    if (data.power_p4) updates.powerP4 = normalizeNumber(data.power_p4);
    if (data.power_p5) updates.powerP5 = normalizeNumber(data.power_p5);
    if (data.power_p6) updates.powerP6 = normalizeNumber(data.power_p6);

    // Calculate consumption percentages
    const p1 = parseFloat(normalizeNumber(data.p1_consumption_pct) || '0');
    const p2 = parseFloat(normalizeNumber(data.p2_consumption_pct) || '0');
    const p3 = parseFloat(normalizeNumber(data.p3_consumption_pct) || '0');
    const p4 = parseFloat(normalizeNumber(data.p4_consumption_pct) || '0');
    const p5 = parseFloat(normalizeNumber(data.p5_consumption_pct) || '0');
    const p6 = parseFloat(normalizeNumber(data.p6_consumption_pct) || '0');

    const totalConsumption = p1 + p2 + p3 + p4 + p5 + p6;

    if (totalConsumption > 0) {
        updates.consP1 = ((p1 / totalConsumption) * 100).toFixed(2);
        updates.consP2 = ((p2 / totalConsumption) * 100).toFixed(2);
        updates.consP3 = ((p3 / totalConsumption) * 100).toFixed(2);

        let remaining = 100 - (parseFloat(updates.consP1) + parseFloat(updates.consP2) + parseFloat(updates.consP3));

        if (p4 > 0) {
            updates.consP4 = ((p4 / totalConsumption) * 100).toFixed(2);
            remaining -= parseFloat(updates.consP4);
        }
        if (p5 > 0) {
            updates.consP5 = ((p5 / totalConsumption) * 100).toFixed(2);
            remaining -= parseFloat(updates.consP5);
        }
        if (p6 > 0) {
            updates.consP6 = remaining.toFixed(2);
        } else if (remaining !== 0 && updates.consP3) {
            const p3Val = parseFloat(updates.consP3) + remaining;
            updates.consP3 = p3Val.toFixed(2);
        }

        // Auto-fill total annual consumption if missing or 0
        if (!updates.consumption || parseFloat(updates.consumption) === 0) {
            updates.consumption = totalConsumption.toFixed(0);
        }
    }

    if (data.current_supplier && typeof data.current_supplier === 'string') {
        const supplierName = String(data.current_supplier);
        const foundSupplier = suppliers.find(s =>
            s.name.toLowerCase().includes(supplierName.toLowerCase()) ||
            supplierName.toLowerCase().includes(s.name.toLowerCase())
        );
        updates.currentSupplier = foundSupplier ? foundSupplier.name : supplierName;
    } else if (data.current_supplier) {
        updates.currentSupplier = String(data.current_supplier);
    }

    return updates;
}
