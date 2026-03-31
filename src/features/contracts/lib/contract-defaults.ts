import { ContractTemplate } from '@/shared/types'

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
