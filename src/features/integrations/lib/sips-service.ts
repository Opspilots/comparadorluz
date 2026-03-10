import { supabase } from '@/shared/lib/supabase'

/**
 * SIPS (Sistema de Información de Puntos de Suministro)
 *
 * Service for importing distributor data into supply points.
 * SIPS data includes: contracted power by period, meter type, voltage level,
 * connection date, last meter reading, etc.
 *
 * In production this would call the SIPS API via an edge function.
 * Currently supports manual import and future API integration.
 */

export interface SipsSupplyData {
    cups: string
    distributor?: string
    contracted_power_p1_kw?: number
    contracted_power_p2_kw?: number
    contracted_power_p3_kw?: number
    contracted_power_p4_kw?: number
    contracted_power_p5_kw?: number
    contracted_power_p6_kw?: number
    annual_consumption_kwh?: number
    tariff_type?: string
    meter_type?: string
    voltage_level?: string
    connection_date?: string
    last_meter_reading_date?: string
    point_type?: number
    current_supplier?: string
}

/**
 * Import SIPS data for a supply point (manual entry).
 */
export async function importSipsData(
    supplyPointId: string,
    data: SipsSupplyData
): Promise<{ ok: boolean; error?: string }> {
    const updatePayload: Record<string, unknown> = {
        sips_imported_at: new Date().toISOString(),
        sips_data: data,
    }

    if (data.distributor) updatePayload.distributor = data.distributor
    if (data.contracted_power_p1_kw) updatePayload.contracted_power_p1_kw = data.contracted_power_p1_kw
    if (data.contracted_power_p2_kw) updatePayload.contracted_power_p2_kw = data.contracted_power_p2_kw
    if (data.contracted_power_p3_kw) updatePayload.contracted_power_p3_kw = data.contracted_power_p3_kw
    if (data.contracted_power_p4_kw) updatePayload.contracted_power_p4_kw = data.contracted_power_p4_kw
    if (data.contracted_power_p5_kw) updatePayload.contracted_power_p5_kw = data.contracted_power_p5_kw
    if (data.contracted_power_p6_kw) updatePayload.contracted_power_p6_kw = data.contracted_power_p6_kw
    if (data.annual_consumption_kwh) updatePayload.annual_consumption_kwh = data.annual_consumption_kwh
    if (data.tariff_type) updatePayload.tariff_type = data.tariff_type
    if (data.meter_type) updatePayload.meter_type = data.meter_type
    if (data.voltage_level) updatePayload.voltage_level = data.voltage_level
    if (data.connection_date) updatePayload.connection_date = data.connection_date
    if (data.last_meter_reading_date) updatePayload.last_meter_reading_date = data.last_meter_reading_date
    if (data.point_type) updatePayload.point_type = data.point_type
    if (data.current_supplier) updatePayload.current_supplier = data.current_supplier

    // Also update the main contracted_power_kw with P1 (most common reference)
    if (data.contracted_power_p1_kw && !updatePayload.contracted_power_kw) {
        updatePayload.contracted_power_kw = data.contracted_power_p1_kw
    }

    const { error } = await supabase
        .from('supply_points')
        .update(updatePayload)
        .eq('id', supplyPointId)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
}

/**
 * Fetch SIPS data via edge function (when SIPS integration is active).
 */
export async function fetchSipsViaApi(
    companyId: string,
    integrationId: string,
    cups: string
): Promise<{ ok: boolean; data?: SipsSupplyData; error?: string }> {
    const { data, error } = await supabase.functions.invoke('integration-sync', {
        body: {
            action: 'fetch_sips',
            companyId,
            integrationId,
            cups,
        },
    })

    if (error) return { ok: false, error: error.message }
    return data as { ok: boolean; data?: SipsSupplyData; error?: string }
}
