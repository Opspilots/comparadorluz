import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { Customer, SupplyPoint, TariffVersion, ContractTemplate } from '@/shared/types'
import { Supplier } from '@/types/tariff'

export const DEFAULT_CONTRACT_TEMPLATE: Omit<ContractTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'> = {
    primary_color: '#2563eb',
    accent_color: '#f59e0b',
    text_color: '#111827',
    section_bg_color: '#f9fafb',
    notes_bg_color: '#fffbeb',
    notes_border_color: '#f59e0b',
    contract_title: 'CONTRATO DE SUMINISTRO',
    company_name: 'ENERGY DEAL',
    company_tagline: '',
    company_logo_url: '',
    footer_text: 'Documento generado a través de CRM Luz. Este documento tiene carácter informativo y contractual una vez firmado.',
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
    }
    customer?: Customer
    tariff?: TariffVersion & { suppliers?: Supplier }
    supplyPoint?: SupplyPoint
    template?: ContractTemplate | null
}

export function ContractDocument({ contract, customer, tariff, supplyPoint, template }: ContractDocumentProps) {
    const t = { ...DEFAULT_CONTRACT_TEMPLATE, ...template }
    const monthlyValue = contract.annual_value_eur ? (contract.annual_value_eur / 12) : 0
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
            marginBottom: 14,
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
            marginBottom: 4,
        },
        label: {
            width: 140,
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
            marginTop: 48,
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
            marginTop: 10,
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
    })

    const logoUrl = t.company_logo_url?.trim()

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

                {/* 1. Titular */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. DATOS DEL TITULAR</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombre / Razón Social:</Text>
                        <Text style={styles.value}>{customer?.name || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>CIF / NIF:</Text>
                        <Text style={styles.value}>{customer?.cif || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Dirección:</Text>
                        <Text style={styles.value}>{customer?.address || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Contacto:</Text>
                        <Text style={styles.value}>{customer?.website || '---'}</Text>
                    </View>
                </View>

                {/* 2. Suministro */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. DATOS DEL SUMINISTRO</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>CUPS:</Text>
                        <Text style={styles.value}>{supplyPoint?.cups || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Dirección Suministro:</Text>
                        <Text style={styles.value}>{supplyPoint?.address || 'Misma que titular'}</Text>
                    </View>
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
                </View>

                {/* 3. Condiciones económicas */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. CONDICIONES ECONÓMICAS</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Comercializadora:</Text>
                        <Text style={styles.value}>{tariff?.suppliers?.name || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombre de Tarifa:</Text>
                        <Text style={styles.value}>{tariff?.tariff_name || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Valor Mensual:</Text>
                        <Text style={styles.valueHighlight}>
                            {monthlyValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Fecha de Firma:</Text>
                        <Text style={styles.value}>{contract.signed_at || '---'}</Text>
                    </View>
                    <Text style={{ fontSize: fs - 2, marginTop: 6, color: '#888', fontStyle: 'italic' }}>
                        * Precios sin impuestos incluidos. Se aplicarán los impuestos vigentes según ley.
                    </Text>
                </View>

                {/* 4. Anotaciones */}
                {contract.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>4. ANOTACIONES</Text>
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

                {/* Firmas */}
                <View style={styles.signatureArea}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>EL TITULAR</Text>
                        <Text style={styles.signatureSub}>{customer?.name}</Text>
                        <Text style={styles.signatureSub}>{contract.signed_at}</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>LA COMERCIALIZADORA</Text>
                        <Text style={styles.signatureSub}>{tariff?.suppliers?.name}</Text>
                        <Text style={styles.signatureSub}> </Text>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    {t.footer_text}
                    {t.footer_show_date ? `  ·  ${new Date().toLocaleDateString('es-ES')}` : ''}
                </Text>

            </Page>
        </Document>
    )
}
