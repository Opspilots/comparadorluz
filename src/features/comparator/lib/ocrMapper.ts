import { normalizeNumber } from '@/shared/lib/utils';


interface OcrData {
    customer_name?: string;
    cif?: string;
    supply_type?: string;
    atrr?: string;
    tariff_type?: string;
    annual_consumption?: string | number;
    contracted_power?: string | number;
    cups?: string;
    current_cost?: string | number;
    power_p1?: string | number;
    power_p2?: string | number;
    power_p3?: string | number;
    power_p4?: string | number;
    power_p5?: string | number;
    power_p6?: string | number;
    p1_consumption_pct?: string | number;
    p2_consumption_pct?: string | number;
    p3_consumption_pct?: string | number;
    p4_consumption_pct?: string | number;
    p5_consumption_pct?: string | number;
    p6_consumption_pct?: string | number;
    current_supplier?: string;
    conversion_factor?: string | number;
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

export function mapOcrData(data: OcrData, suppliers: { id: string, name: string }[]): MappedOcrData {
    const updates: MappedOcrData = {};

    if (data.customer_name) updates.customerName = data.customer_name;
    if (data.cif) updates.cif = data.cif;

    // Supply Type Detection
    if (data.supply_type === 'gas' || data.atrr?.includes('RL') || data.tariff_type?.includes('RL')) {
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
        let t = data.tariff_type.toUpperCase().replace(/\s/g, ''); // Remove spaces
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

        updates.tariffType = t;
    }
    if (data.annual_consumption) updates.consumption = normalizeNumber(data.annual_consumption);
    if (data.contracted_power) updates.power = normalizeNumber(data.contracted_power);
    if (data.cups) updates.cups = data.cups;
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

        let remaining = 100 - (parseFloat(updates.consP1!) + parseFloat(updates.consP2!) + parseFloat(updates.consP3!));

        if (p4 > 0) {
            updates.consP4 = ((p4 / totalConsumption) * 100).toFixed(2);
            remaining -= parseFloat(updates.consP4!);
        }
        if (p5 > 0) {
            updates.consP5 = ((p5 / totalConsumption) * 100).toFixed(2);
            remaining -= parseFloat(updates.consP5!);
        }
        if (p6 > 0) {
            updates.consP6 = remaining.toFixed(2);
        } else if (remaining !== 0) {
            const p3Val = parseFloat(updates.consP3!) + remaining;
            updates.consP3 = p3Val.toFixed(2);
        }

        // Auto-fill total annual consumption if missing or 0
        if (!updates.consumption || parseFloat(updates.consumption) === 0) {
            updates.consumption = totalConsumption.toFixed(0);
        }
    }

    if (data.current_supplier && typeof data.current_supplier === 'string') {
        const supplierName = data.current_supplier;
        const foundSupplier = suppliers.find(s =>
            s.name.toLowerCase().includes(supplierName.toLowerCase()) ||
            supplierName.toLowerCase().includes(s.name.toLowerCase())
        );
        updates.currentSupplier = foundSupplier ? foundSupplier.name : supplierName;
    }

    return updates;
}
