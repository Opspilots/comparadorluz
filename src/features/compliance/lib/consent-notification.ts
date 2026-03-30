import { supabase } from '@/shared/lib/supabase'
import { sendMessage } from '@/features/messaging/lib/messaging-service'
import type { ConsentType } from '@/shared/types'

export const CONSENT_LEGAL_TEXTS: Record<ConsentType, { label: string; text: string; required: boolean; docUrl: string; docLabel: string }> = {
    data_processing: {
        label: 'Tratamiento de datos personales',
        text: 'En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), autorizo el tratamiento de mis datos personales para la gestión de mi suministro energético, comparación de tarifas y servicios asociados.',
        required: true,
        docUrl: 'https://www.boe.es/doue/2016/119/L00001-00088.pdf',
        docLabel: 'Reglamento (UE) 2016/679 — RGPD',
    },
    commercial_contact: {
        label: 'Contacto comercial',
        text: 'De acuerdo con la Ley 34/2002 (LSSI-CE), Art. 21, autorizo el contacto comercial por los medios indicados para recibir información sobre ofertas y servicios energéticos.',
        required: true,
        docUrl: 'https://www.boe.es/eli/es/lo/2018/12/05/3/con',
        docLabel: 'Ley Orgánica 3/2018 — LOPDGDD',
    },
    switching_authorization: {
        label: 'Autorización de cambio de comercializadora',
        text: 'Autorizo la tramitación del cambio de comercializadora eléctrica/gas conforme a la normativa de la CNMC y el proceso ATR establecido.',
        required: true,
        docUrl: 'https://www.cnmc.es/ambitos-de-actuacion/energia/mercado-electrico',
        docLabel: 'CNMC — Normativa de cambio de comercializadora',
    },
    data_sharing: {
        label: 'Cesión de datos a terceros',
        text: 'Autorizo la cesión de mis datos a las comercializadoras energéticas necesarias para la gestión de ofertas y contratación, conforme al RGPD Art. 6.1.a.',
        required: false,
        docUrl: 'https://www.aepd.es/guias/guia-consentimiento.pdf',
        docLabel: 'AEPD — Guía sobre el consentimiento',
    },
    marketing: {
        label: 'Comunicaciones comerciales electrónicas',
        text: 'Conforme al Art. 21 de la LSSI-CE, consiento recibir comunicaciones comerciales electrónicas sobre productos y servicios energéticos.',
        required: false,
        docUrl: 'https://www.boe.es/eli/es/l/2002/07/11/34/con',
        docLabel: 'Ley 34/2002 — LSSI-CE',
    },
}

interface SendConsentRequestData {
    companyId: string
    customerId: string
    consentTypes: ConsentType[]
    channel: 'email' | 'whatsapp'
    notes?: string
}

export async function sendConsentRequest(data: SendConsentRequestData): Promise<{
    sent: boolean
    channel?: 'email' | 'whatsapp'
    token?: string
    error?: string
}> {
    try {
        // 1. Check messaging settings
        const { data: company, error: companyErr } = await supabase
            .from('companies')
            .select('id, name, messaging_settings')
            .eq('id', data.companyId)
            .single()

        if (companyErr || !company?.messaging_settings) {
            return { sent: false, error: 'No hay configuración de mensajería' }
        }

        const settings = company.messaging_settings as {
            google_refresh_token?: string
            email_from?: string
            whatsapp_token?: string
            whatsapp_phone_number_id?: string
        }

        const hasEmail = !!(settings.google_refresh_token && settings.email_from)
        const hasWhatsApp = !!(settings.whatsapp_token && settings.whatsapp_phone_number_id)

        if (data.channel === 'email' && !hasEmail) {
            return { sent: false, error: 'Email no configurado' }
        }
        if (data.channel === 'whatsapp' && !hasWhatsApp) {
            return { sent: false, error: 'WhatsApp no configurado' }
        }

        // 2. Find contact (scoped to tenant)
        const { data: contacts } = await supabase
            .from('contacts')
            .select('id, first_name, last_name, email, phone, is_primary')
            .eq('customer_id', data.customerId)
            .eq('company_id', data.companyId)
            .order('is_primary', { ascending: false })
            .limit(5)

        if (!contacts || contacts.length === 0) {
            return { sent: false, error: 'El cliente no tiene contactos registrados' }
        }

        let recipientContact = ''
        let contactId = ''

        if (data.channel === 'email') {
            const emailContact = contacts.find(c => c.email)
            if (emailContact) {
                recipientContact = emailContact.email!
                contactId = emailContact.id
            }
        } else {
            const phoneContact = contacts.find(c => c.phone)
            if (phoneContact) {
                recipientContact = phoneContact.phone!
                contactId = phoneContact.id
            }
        }

        if (!recipientContact) {
            return { sent: false, error: `No se encontró contacto con ${data.channel === 'email' ? 'email' : 'teléfono'}` }
        }

        // 3. Get customer name
        const { data: customer } = await supabase
            .from('customers')
            .select('name')
            .eq('id', data.customerId)
            .single()

        const customerName = customer?.name || 'Cliente'

        // 4. Generate token and build legal text
        const token = crypto.randomUUID()
        const signingUrl = `${window.location.origin}/consent/sign/${token}`

        const legalText = data.consentTypes.map(ct => {
            const info = CONSENT_LEGAL_TEXTS[ct]
            return `**${info.label}${info.required ? ' (obligatorio)' : ''}:**\n${info.text}`
        }).join('\n\n')

        // 5. Build message
        const { data: { user } } = await supabase.auth.getUser()
        let content: string
        let subject: string | undefined

        if (data.channel === 'email') {
            subject = `Solicitud de consentimiento — ${company.name || 'EnergyDeal'}`
            content = buildConsentEmailHtml({
                customerName,
                companyName: company.name || 'EnergyDeal',
                consentTypes: data.consentTypes,
                signingUrl,
            })
        } else {
            content = buildConsentWhatsAppText({
                customerName,
                companyName: company.name || 'EnergyDeal',
                consentTypes: data.consentTypes,
                signingUrl,
            })
        }

        // 6. Insert consent_request record FIRST — so the signing URL is valid if message arrives instantly
        const { error: insertError } = await supabase
            .from('consent_requests')
            .insert({
                company_id: data.companyId,
                customer_id: data.customerId,
                contact_id: contactId,
                consent_types: data.consentTypes,
                legal_text: legalText,
                channel: data.channel,
                recipient_contact: recipientContact,
                message_id: null,
                token,
                status: 'sent',
                sent_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                notes: data.notes || null,
                created_by: user?.id || null,
            })

        if (insertError) throw insertError

        // 7. Send message — if this fails, the consent record exists but can be resent
        const message = await sendMessage({
            company_id: data.companyId,
            customer_id: data.customerId,
            contact_id: contactId,
            channel: data.channel,
            recipient_contact: recipientContact,
            content,
            subject,
        })

        // Update consent_request with message_id
        await supabase
            .from('consent_requests')
            .update({ message_id: message.id })
            .eq('token', token)
            .eq('company_id', data.companyId)

        return { sent: true, channel: data.channel, token }
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Error desconocido'
        console.error('sendConsentRequest failed:', error)
        return { sent: false, error }
    }
}

export function getAvailableChannels(settings: Record<string, unknown> | null): {
    email: boolean
    whatsapp: boolean
} {
    if (!settings) return { email: false, whatsapp: false }
    const s = settings as {
        google_refresh_token?: string
        email_from?: string
        whatsapp_token?: string
        whatsapp_phone_number_id?: string
    }
    return {
        email: !!(s.google_refresh_token && s.email_from),
        whatsapp: !!(s.whatsapp_token && s.whatsapp_phone_number_id),
    }
}

/** Escape user-controlled strings before embedding in HTML to prevent XSS */
function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildConsentEmailHtml(data: {
    customerName: string
    companyName: string
    consentTypes: ConsentType[]
    signingUrl: string
}): string {
    const safeCustomerName = escapeHtml(data.customerName)
    const safeCompanyName = escapeHtml(data.companyName)
    const consentRows = data.consentTypes.map(ct => {
        const info = CONSENT_LEGAL_TEXTS[ct]
        return `
        <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #f1f5f9;">
                <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">
                    ${info.label}${info.required ? ' <span style="color: #dc2626; font-size: 11px;">(obligatorio)</span>' : ''}
                </div>
                <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                    ${info.text}
                </div>
                <div style="margin-top: 6px;">
                    <a href="${info.docUrl}" target="_blank" rel="noopener noreferrer"
                       style="font-size: 12px; color: #2563eb; text-decoration: none; font-weight: 500;">
                        📄 ${info.docLabel}
                    </a>
                </div>
            </td>
        </tr>`
    }).join('')

    return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
    <div style="background: #2563eb; padding: 28px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">Solicitud de Consentimiento</h1>
        <p style="color: #bfdbfe; margin: 6px 0 0; font-size: 13px;">${safeCompanyName} — Cumplimiento RGPD</p>
    </div>

    <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
            Estimado/a <strong>${safeCustomerName}</strong>,
        </p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Necesitamos su consentimiento expreso para los siguientes tratamientos de datos.
            Por favor, revise la información y firme digitalmente a través del enlace seguro:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            ${consentRows}
        </table>

        <div style="text-align: center; margin: 28px 0;">
            <a href="${escapeHtml(data.signingUrl)}"
               style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                Revisar y Firmar
            </a>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 24px;">
            Este enlace es válido durante <strong>30 días</strong>. Una vez firmado, recibirá confirmación
            y podrá ejercer su derecho de revocación en cualquier momento conforme al Art. 7.3 del RGPD.
        </p>

        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
            Este mensaje ha sido generado por ${safeCompanyName}. Si tiene dudas, contacte con nuestro
            Delegado de Protección de Datos en la dirección indicada en nuestra política de privacidad.
        </p>
    </div>
</div>`.trim()
}

function buildConsentWhatsAppText(data: {
    customerName: string
    companyName: string
    consentTypes: ConsentType[]
    signingUrl: string
}): string {
    const typesList = data.consentTypes.map(ct => {
        const info = CONSENT_LEGAL_TEXTS[ct]
        return `• ${info.label}${info.required ? ' (obligatorio)' : ''}\n  Mas info: ${info.docUrl}`
    }).join('\n')

    return [
        `*Solicitud de Consentimiento*`,
        `${data.companyName}`,
        ``,
        `Estimado/a ${data.customerName},`,
        ``,
        `Necesitamos su consentimiento para:`,
        typesList,
        ``,
        `Revise y firme digitalmente aquí:`,
        data.signingUrl,
        ``,
        `Enlace válido 30 días. Puede revocar su consentimiento en cualquier momento (RGPD Art. 7.3).`,
    ].join('\n')
}
