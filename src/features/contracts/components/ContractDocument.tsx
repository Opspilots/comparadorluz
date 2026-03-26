import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { Customer, SupplyPoint, TariffVersion, ContractTemplate } from '@/shared/types'
import { Supplier } from '@/shared/types'

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_CONTRACT_TEMPLATE: Omit<ContractTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'> = {
    primary_color: '#2563eb',
    accent_color: '#f59e0b',
    text_color: '#111827',
    section_bg_color: '#f9fafb',
    notes_bg_color: '#fffbeb',
    notes_border_color: '#f59e0b',
    contract_title: 'CONTRATO DE SUMINISTRO DE ENERGIA',
    company_name: 'ENERGY DEAL',
    company_tagline: '',
    company_logo_url: '',
    footer_text: 'Documento generado a traves de CRM Luz. Este documento tiene caracter informativo y contractual una vez firmado.',
    footer_show_date: true,
    footer_show_page_number: true,
    font_size_base: 10,
    page_padding: 40,
    custom_legal_text: '',
}

const statusLabels: Record<string, string> = {
    'pending': 'Pendiente',
    'signed': 'Firmado',
    'active': 'Activo',
    'cancelled': 'Cancelado',
    'completed': 'Completado'
}

interface ContractDocumentProps {
    contract: {
        contract_number?: string;
        signed_at?: string;
        annual_value_eur?: number;
        status?: string;
        notes?: string;
        activation_date?: string;
    }
    customer?: Customer
    tariff?: TariffVersion & { suppliers?: Supplier }
    supplyPoint?: SupplyPoint
    template?: ContractTemplate | null
}

export function ContractDocument({ contract, customer, tariff, supplyPoint, template }: ContractDocumentProps) {
    const t = { ...DEFAULT_CONTRACT_TEMPLATE, ...template }
    const monthlyValue = contract.annual_value_eur ? (contract.annual_value_eur / 12) : 0
    const annualValue = contract.annual_value_eur ?? 0
    const fs = t.font_size_base
    const pad = t.page_padding

    const styles = StyleSheet.create({
        page: {
            padding: pad,
            fontFamily: 'Helvetica',
            fontSize: fs,
            color: t.text_color,
        },
        header: {
            marginBottom: 20,
            borderBottom: `1px solid ${t.primary_color}`,
            paddingBottom: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        title: {
            fontSize: fs + 14,
            fontWeight: 'bold',
            color: t.primary_color,
            letterSpacing: 1,
        },
        subtitle: {
            fontSize: fs,
            color: '#666',
            marginTop: 2,
        },
        companyBlock: {
            alignItems: 'flex-end',
        },
        companyName: {
            fontSize: fs + 6,
            fontWeight: 'bold',
            color: t.primary_color,
        },
        companyTagline: {
            fontSize: fs - 1,
            color: '#888',
            marginTop: 2,
        },
        statusBadge: {
            fontSize: fs - 1,
            color: '#fff',
            backgroundColor: t.primary_color,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 3,
            marginTop: 4,
            alignSelf: 'flex-end',
        },
        section: {
            marginBottom: 12,
            padding: 10,
            backgroundColor: t.section_bg_color,
            borderRadius: 4,
            borderLeft: `3px solid ${t.primary_color}`,
        },
        sectionTitle: {
            fontSize: fs + 2,
            fontWeight: 'bold',
            marginBottom: 8,
            color: t.primary_color,
            borderBottom: `1px solid ${t.primary_color}22`,
            paddingBottom: 4,
        },
        row: {
            flexDirection: 'row',
            marginBottom: 3,
        },
        label: {
            width: 150,
            fontWeight: 'bold',
            color: '#555',
            fontSize: fs,
        },
        value: {
            flex: 1,
            fontSize: fs,
        },
        valueHighlight: {
            flex: 1,
            fontWeight: 'bold',
            fontSize: fs + 2,
            color: t.primary_color,
        },
        footer: {
            position: 'absolute',
            bottom: 24,
            left: pad,
            right: pad,
            textAlign: 'center',
            color: '#aaa',
            fontSize: fs - 2,
            borderTop: `1px solid #eee`,
            paddingTop: 8,
        },
        signatureArea: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 40,
            marginBottom: 20,
        },
        signatureBox: {
            borderTop: `2px solid ${t.accent_color}`,
            width: 200,
            paddingTop: 6,
        },
        signatureLabel: {
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: fs,
            color: t.text_color,
        },
        signatureSub: {
            textAlign: 'center',
            fontSize: fs - 1,
            color: '#666',
            marginTop: 2,
        },
        notesBox: {
            marginTop: 5,
            padding: 8,
            backgroundColor: t.notes_bg_color,
            borderRadius: 4,
            borderLeft: `3px solid ${t.notes_border_color}`,
        },
        legalBox: {
            marginTop: 8,
            padding: 8,
            backgroundColor: '#f8fafc',
            borderRadius: 4,
            borderTop: `1px solid #e2e8f0`,
        },
        legalText: {
            fontSize: fs - 2,
            color: '#888',
            lineHeight: 1.6,
        },
        legalTitle: {
            fontSize: fs - 1,
            fontWeight: 'bold',
            color: '#666',
            marginBottom: 4,
        },
        smallNote: {
            fontSize: fs - 2,
            marginTop: 4,
            color: '#888',
            fontStyle: 'italic',
        },
    })

    const logoUrl = t.company_logo_url?.trim()

    // Build tariff rate details from components if available
    const energyRates = tariff?.tariff_components?.filter(c => c.component_type === 'energy_price') ?? []
    const powerRates = tariff?.tariff_components?.filter(c => c.component_type === 'power_price') ?? []
    const fixedFees = tariff?.tariff_components?.filter(c => c.component_type === 'fixed_fee') ?? []

    // Also check tariff_rates
    const energyTariffRates = tariff?.tariff_rates?.filter(r => r.item_type === 'energy') ?? []
    const powerTariffRates = tariff?.tariff_rates?.filter(r => r.item_type === 'power') ?? []

    const hasDetailedRates = energyRates.length > 0 || energyTariffRates.length > 0
    const contractDuration = tariff?.contract_duration

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>{t.contract_title}</Text>
                        <Text style={styles.subtitle}>Ref: {contract.contract_number || '---'}</Text>
                    </View>
                    <View style={styles.companyBlock}>
                        {logoUrl ? (
                            <Image src={logoUrl} style={{ width: 80, height: 30, objectFit: 'contain' }} />
                        ) : (
                            <Text style={styles.companyName}>{t.company_name}</Text>
                        )}
                        {t.company_tagline ? (
                            <Text style={styles.companyTagline}>{t.company_tagline}</Text>
                        ) : null}
                        <Text style={styles.statusBadge}>
                            {statusLabels[contract.status || ''] || contract.status || '---'}
                        </Text>
                    </View>
                </View>

                {/* 1. Datos del Titular */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. DATOS DEL TITULAR</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombre / Razon Social:</Text>
                        <Text style={styles.value}>{customer?.name || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>CIF / NIF:</Text>
                        <Text style={styles.value}>{customer?.cif || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Direccion:</Text>
                        <Text style={styles.value}>{customer?.address || '---'}</Text>
                    </View>
                    {customer?.city && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Localidad / Provincia:</Text>
                            <Text style={styles.value}>
                                {[customer.city, customer.province, customer.postal_code].filter(Boolean).join(', ')}
                            </Text>
                        </View>
                    )}
                    <View style={styles.row}>
                        <Text style={styles.label}>Tipo de Cliente:</Text>
                        <Text style={styles.value}>
                            {customer?.customer_type === 'empresa' ? 'Empresa' : 'Particular'}
                        </Text>
                    </View>
                </View>

                {/* 2. Datos del Punto de Suministro */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. DATOS DEL PUNTO DE SUMINISTRO</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>CUPS:</Text>
                        <Text style={styles.value}>{supplyPoint?.cups || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Direccion Suministro:</Text>
                        <Text style={styles.value}>{supplyPoint?.address || 'Misma que titular'}</Text>
                    </View>
                    {supplyPoint?.city && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Localidad:</Text>
                            <Text style={styles.value}>
                                {[supplyPoint.city, supplyPoint.province, supplyPoint.postal_code].filter(Boolean).join(', ')}
                            </Text>
                        </View>
                    )}
                    <View style={styles.row}>
                        <Text style={styles.label}>Tarifa de Acceso:</Text>
                        <Text style={styles.value}>{tariff?.tariff_type || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Potencia Contratada:</Text>
                        <Text style={styles.value}>
                            {supplyPoint?.contracted_power_kw ? `${supplyPoint.contracted_power_kw} kW` : '---'}
                        </Text>
                    </View>
                    {supplyPoint?.annual_consumption_kwh && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Consumo Anual:</Text>
                            <Text style={styles.value}>
                                {supplyPoint.annual_consumption_kwh.toLocaleString('es-ES')} kWh
                            </Text>
                        </View>
                    )}
                    {supplyPoint?.current_supplier && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Comercializadora Actual:</Text>
                            <Text style={styles.value}>{supplyPoint.current_supplier}</Text>
                        </View>
                    )}
                </View>

                {/* 3. Datos de la Comercializadora */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. DATOS DE LA COMERCIALIZADORA</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Comercializadora:</Text>
                        <Text style={styles.value}>{tariff?.suppliers?.name || tariff?.supplier_name || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombre de Tarifa:</Text>
                        <Text style={styles.value}>{tariff?.tariff_name || '---'}</Text>
                    </View>
                    {tariff?.tariff_code && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Codigo de Tarifa:</Text>
                            <Text style={styles.value}>{tariff.tariff_code}</Text>
                        </View>
                    )}
                    <View style={styles.row}>
                        <Text style={styles.label}>Tipo de Tarifa:</Text>
                        <Text style={styles.value}>
                            {tariff?.is_indexed ? 'Indexada (precio variable)' : 'Precio fijo'}
                        </Text>
                    </View>
                </View>

                {/* 4. Condiciones Economicas */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. CONDICIONES ECONOMICAS</Text>

                    {/* Precios por periodo si hay datos detallados */}
                    {hasDetailedRates && (
                        <View style={{ marginBottom: 8 }}>
                            <Text style={{ fontSize: fs - 1, fontWeight: 'bold', color: '#555', marginBottom: 4 }}>
                                Precios de Energia (EUR/kWh):
                            </Text>
                            {energyRates.length > 0 ? (
                                energyRates.map((rate, i) => (
                                    <View key={i} style={styles.row}>
                                        <Text style={styles.label}>  {rate.period || `Periodo ${i + 1}`}:</Text>
                                        <Text style={styles.value}>
                                            {rate.price_eur_kwh?.toFixed(6) ?? '---'} EUR/kWh
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                energyTariffRates.map((rate, i) => (
                                    <View key={i} style={styles.row}>
                                        <Text style={styles.label}>  {rate.period || `Periodo ${i + 1}`}:</Text>
                                        <Text style={styles.value}>
                                            {rate.price?.toFixed(6) ?? '---'} {rate.unit}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {(powerRates.length > 0 || powerTariffRates.length > 0) && (
                        <View style={{ marginBottom: 8 }}>
                            <Text style={{ fontSize: fs - 1, fontWeight: 'bold', color: '#555', marginBottom: 4 }}>
                                Precios de Potencia (EUR/kW/ano):
                            </Text>
                            {powerRates.length > 0 ? (
                                powerRates.map((rate, i) => (
                                    <View key={i} style={styles.row}>
                                        <Text style={styles.label}>  {rate.period || `Periodo ${i + 1}`}:</Text>
                                        <Text style={styles.value}>
                                            {rate.price_eur_kw_year?.toFixed(4) ?? '---'} EUR/kW/ano
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                powerTariffRates.map((rate, i) => (
                                    <View key={i} style={styles.row}>
                                        <Text style={styles.label}>  {rate.period || `Periodo ${i + 1}`}:</Text>
                                        <Text style={styles.value}>
                                            {rate.price?.toFixed(4) ?? '---'} {rate.unit}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {fixedFees.length > 0 && (
                        <View style={{ marginBottom: 8 }}>
                            {fixedFees.map((fee, i) => (
                                <View key={i} style={styles.row}>
                                    <Text style={styles.label}>Cuota Fija:</Text>
                                    <Text style={styles.value}>
                                        {fee.fixed_price_eur_month?.toFixed(2) ?? '---'} EUR/mes
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.row}>
                        <Text style={styles.label}>Valor Mensual Estimado:</Text>
                        <Text style={styles.valueHighlight}>
                            {monthlyValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Valor Anual Estimado:</Text>
                        <Text style={styles.value}>
                            {annualValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Fecha de Firma:</Text>
                        <Text style={styles.value}>{contract.signed_at || '---'}</Text>
                    </View>
                    {contract.activation_date && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Fecha de Activacion:</Text>
                            <Text style={styles.value}>{contract.activation_date}</Text>
                        </View>
                    )}
                    <Text style={styles.smallNote}>
                        * Precios sin impuestos incluidos. Se aplicaran los impuestos vigentes segun normativa.
                        IVA (21%), Impuesto Electrico (5,1127%) aplicables sobre el importe correspondiente.
                    </Text>
                </View>

                {/* 5. Duracion y Condiciones */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. DURACION Y CONDICIONES DE RENOVACION</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Duracion del Contrato:</Text>
                        <Text style={styles.value}>
                            {contractDuration ? `${contractDuration} meses` : '12 meses (por defecto)'}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Renovacion:</Text>
                        <Text style={styles.value}>
                            Automatica por periodos iguales, salvo comunicacion en contrario con al menos
                            30 dias de antelacion al vencimiento.
                        </Text>
                    </View>
                    {tariff?.valid_from && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Vigencia Tarifa:</Text>
                            <Text style={styles.value}>
                                Desde {tariff.valid_from}{tariff.valid_to ? ` hasta ${tariff.valid_to}` : ''}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.smallNote}>
                        * En caso de tarifas indexadas, los precios de energia se actualizan segun el indice de referencia
                        indicado por la comercializadora.
                    </Text>
                </View>

                {/* 6. Anotaciones */}
                {contract.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>6. ANOTACIONES</Text>
                        <View style={styles.notesBox}>
                            <Text style={{ fontSize: fs - 1, lineHeight: 1.5 }}>{contract.notes}</Text>
                        </View>
                    </View>
                )}

                {/* Texto legal personalizado */}
                {t.custom_legal_text && (
                    <View style={styles.legalBox}>
                        <Text style={styles.legalText}>{t.custom_legal_text}</Text>
                    </View>
                )}

                {/* Clausulas Legales Obligatorias */}
                <View style={styles.legalBox}>
                    <Text style={styles.legalTitle}>CLAUSULAS LEGALES</Text>
                    <Text style={styles.legalText}>
                        1. DERECHO DE DESISTIMIENTO: De conformidad con lo establecido en el Real Decreto
                        Legislativo 1/2007 y la Circular 1/2005 de la CNMC, el consumidor dispone de un plazo
                        de 14 dias naturales desde la firma del presente contrato para ejercer su derecho de
                        desistimiento sin penalizacion alguna y sin necesidad de justificacion. Para ello debera
                        comunicarlo a la comercializadora por cualquier medio que permita dejar constancia.
                    </Text>
                    <Text style={styles.legalText}>
                        {'\n'}2. REGULACION APLICABLE: Este contrato se rige por la Ley 24/2013 del Sector
                        Electrico, el Real Decreto 1435/2002, las Circulares de la CNMC y demas normativa
                        vigente en materia de suministro electrico en Espana.
                    </Text>
                    <Text style={styles.legalText}>
                        {'\n'}3. RESOLUCION DE CONFLICTOS: En caso de discrepancia, el consumidor podra
                        dirigirse a la CNMC (Comision Nacional de los Mercados y la Competencia), a las
                        Juntas Arbitrales de Consumo o a los tribunales competentes.
                    </Text>
                    <Text style={styles.legalText}>
                        {'\n'}4. PROTECCION DE DATOS: Los datos personales seran tratados conforme al
                        Reglamento (UE) 2016/679 (RGPD) y la Ley Organica 3/2018 (LOPDGDD).
                        El titular puede ejercer sus derechos de acceso, rectificacion, supresion,
                        portabilidad, limitacion y oposicion.
                    </Text>
                    <Text style={styles.legalText}>
                        {'\n'}5. CAMBIO DE COMERCIALIZADORA: El proceso de cambio de comercializadora
                        (switching) se realizara conforme al procedimiento ATR establecido por la CNMC,
                        con un plazo maximo de 21 dias naturales desde la solicitud.
                    </Text>
                </View>

                {/* Firmas */}
                <View style={styles.signatureArea}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>EL TITULAR</Text>
                        <Text style={styles.signatureSub}>{customer?.name}</Text>
                        <Text style={styles.signatureSub}>DNI/CIF: {customer?.cif}</Text>
                        <Text style={styles.signatureSub}>{contract.signed_at}</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>LA COMERCIALIZADORA</Text>
                        <Text style={styles.signatureSub}>{tariff?.suppliers?.name || tariff?.supplier_name}</Text>
                        <Text style={styles.signatureSub}> </Text>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    {t.footer_text}
                    {t.footer_show_date ? `  |  ${new Date().toLocaleDateString('es-ES')}` : ''}
                </Text>

            </Page>
        </Document>
    )
}
