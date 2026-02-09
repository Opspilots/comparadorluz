import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { Contract, Customer, TariffVersion, SupplyPoint } from '@/shared/types'

// Register fonts if needed, or use standard fonts
Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf'
})

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333'
    },
    header: {
        marginBottom: 20,
        borderBottom: '1px solid #ccc',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827'
    },
    subtitle: {
        fontSize: 10,
        color: '#666'
    },
    section: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f9fafb',
        borderRadius: 4
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#000',
        borderBottom: '1px solid #ddd',
        paddingBottom: 4
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4
    },
    label: {
        width: 120,
        fontWeight: 'bold',
        color: '#555'
    },
    value: {
        flex: 1
    },
    pricingTable: {
        marginTop: 10,
        borderTop: '1px solid #eee',
        borderLeft: '1px solid #eee'
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #eee'
    },
    tableHeader: {
        backgroundColor: '#f3f4f6',
        fontWeight: 'bold'
    },
    tableCell: {
        padding: 6,
        borderRight: '1px solid #eee',
        flex: 1,
        textAlign: 'center',
        fontSize: 9
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        color: '#999',
        fontSize: 8,
        borderTop: '1px solid #eee',
        paddingTop: 10
    },
    signatureBox: {
        marginTop: 40,
        borderTop: '1px solid #000',
        width: 200,
        paddingTop: 5
    }
})

interface ContractDocumentProps {
    contract: Partial<Contract>
    customer?: Customer
    tariff?: TariffVersion
    supplyPoint?: SupplyPoint
}

export function ContractDocument({ contract, customer, tariff, supplyPoint }: ContractDocumentProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>CONTRATO DE SUMINISTRO</Text>
                        <Text style={styles.subtitle}>Ref: {contract.contract_number}</Text>
                    </View>
                    <View>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>ENERGY DEAL</Text>
                    </View>
                </View>

                {/* Customer Details */}
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
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.value}>{customer?.website || '---'} (Contacto Principal)</Text>
                    </View>
                </View>

                {/* Supply Point Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. DATOS DEL SUMINISTRO</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>CUPS:</Text>
                        <Text style={styles.value}>{supplyPoint?.cups || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Dirección de Suministro:</Text>
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

                {/* Economic Conditions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. CONDICIONES ECONÓMICAS</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Comercializadora:</Text>
                        <Text style={styles.value}>{(tariff as any)?.suppliers?.name || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nombre de Tarifa:</Text>
                        <Text style={styles.value}>{tariff?.tariff_name || '---'}</Text>
                    </View>

                    {/* Simple Pricing Table Placeholder - In real app, iterate components */}
                    <View style={styles.pricingTable}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={styles.tableCell}>Concepto</Text>
                            <Text style={styles.tableCell}>Periodo</Text>
                            <Text style={styles.tableCell}>Precio</Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableCell}>Energía (€/kWh)</Text>
                            <Text style={styles.tableCell}>P1</Text>
                            <Text style={styles.tableCell}>0.1423 €/kWh</Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableCell}>Potencia (€/kW/año)</Text>
                            <Text style={styles.tableCell}>P1</Text>
                            <Text style={styles.tableCell}>38.45 €/kW</Text>
                        </View>
                    </View>
                    <Text style={{ fontSize: 8, marginTop: 5, fontStyle: 'italic' }}>
                        * Precios sin impuestos incluidos. Se aplicarán los impuestos vigentes según ley.
                    </Text>
                </View>

                {/* Signatures */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 }}>
                    <View style={styles.signatureBox}>
                        <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>EL TITULAR</Text>
                        <Text style={{ textAlign: 'center', fontSize: 8, marginTop: 2 }}>{customer?.name}</Text>
                        <Text style={{ textAlign: 'center', fontSize: 8 }}>{contract.signed_at}</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={{ textAlign: 'center', fontWeight: 'bold' }}>LA COMERCIALIZADORA</Text>
                        <Text style={{ textAlign: 'center', fontSize: 8, marginTop: 2 }}>{(tariff as any)?.suppliers?.name}</Text>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Documento generado el {new Date().toLocaleDateString()} a través de CRM Luz.
                    Este documento tiene carácter informativo y contractual una vez firmado.
                </Text>
            </Page>
        </Document>
    )
}
