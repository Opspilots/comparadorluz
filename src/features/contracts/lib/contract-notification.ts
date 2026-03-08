import { supabase } from '@/shared/lib/supabase'
import { sendMessage } from '@/features/messaging/lib/messaging-service'

interface ContractNotificationData {
    contractId: string
    companyId: string
    contractNumber: string
    customerName: string
    customerId: string
    supplierName: string
    tariffName: string
    monthlyValue: number
    signedAt: string
    cups?: string
}

/**
 * Sends the contract notification to the customer via the best available channel.
 * Priority: email > whatsapp. Falls back silently if no channel is configured.
 */
export async function sendContractNotification(data: ContractNotificationData): Promise<{
    sent: boolean
    channel?: 'email' | 'whatsapp'
    error?: string
}> {
    try {
        // 1. Check messaging settings
        const { data: company, error: companyErr } = await supabase
            .from('companies')
            .select('messaging_settings')
            .eq('id', data.companyId)
            .single()

        if (companyErr || !company?.messaging_settings) {
            return { sent: false, error: 'No hay configuracion de mensajeria' }
        }

        const settings = company.messaging_settings as {
            google_refresh_token?: string
            email_from?: string
            whatsapp_token?: string
            whatsapp_phone_number_id?: string
        }

        const hasEmail = !!(settings.google_refresh_token && settings.email_from)
        const hasWhatsApp = !!(settings.whatsapp_token && settings.whatsapp_phone_number_id)

        if (!hasEmail && !hasWhatsApp) {
            return { sent: false, error: 'Ni email ni WhatsApp configurados' }
        }

        // 2. Find primary contact for the customer
        const { data: contacts } = await supabase
            .from('contacts')
            .select('id, first_name, last_name, email, phone, is_primary')
            .eq('customer_id', data.customerId)
            .order('is_primary', { ascending: false })
            .limit(5)

        if (!contacts || contacts.length === 0) {
            return { sent: false, error: 'El cliente no tiene contactos registrados' }
        }

        // Determine channel and recipient
        let channel: 'email' | 'whatsapp' = 'email'
        let recipientContact = ''
        let contactId = ''

        if (hasEmail) {
            const emailContact = contacts.find(c => c.email)
            if (emailContact) {
                channel = 'email'
                recipientContact = emailContact.email!
                contactId = emailContact.id
            }
        }

        if (!recipientContact && hasWhatsApp) {
            const phoneContact = contacts.find(c => c.phone)
            if (phoneContact) {
                channel = 'whatsapp'
                recipientContact = phoneContact.phone!
                contactId = phoneContact.id
            }
        }

        if (!recipientContact) {
            return { sent: false, error: 'No se encontro contacto con email o telefono' }
        }

        // 3. Build message content
        const monthlyFormatted = data.monthlyValue.toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })

        let content: string
        let subject: string | undefined

        if (channel === 'email') {
            subject = `Contrato ${data.contractNumber} - ${data.supplierName}`
            content = buildEmailHtml(data, monthlyFormatted)
        } else {
            content = buildWhatsAppText(data, monthlyFormatted)
        }

        // 5. Send via messaging service
        await sendMessage({
            company_id: data.companyId,
            customer_id: data.customerId,
            contact_id: contactId,
            channel,
            recipient_contact: recipientContact,
            content,
            subject,
        })

        // 6. Mark contract as notified
        await supabase
            .from('contracts')
            .update({ notification_sent: true })
            .eq('id', data.contractId)

        return { sent: true, channel }
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Error desconocido'
        console.error('sendContractNotification failed:', error)
        return { sent: false, error }
    }
}

function buildEmailHtml(
    data: ContractNotificationData,
    monthlyFormatted: string,
): string {
    return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
    <div style="background: #2563eb; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Contrato de Suministro</h1>
        <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 14px;">Ref: ${data.contractNumber}</p>
    </div>

    <div style="padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Estimado/a <strong>${data.customerName}</strong>,
        </p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Le informamos que su contrato de suministro energetico ha sido registrado correctamente.
            A continuacion le detallamos los datos principales:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Comercializadora</td>
                <td style="padding: 10px 0; font-weight: 600; text-align: right; font-size: 14px;">${data.supplierName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Tarifa</td>
                <td style="padding: 10px 0; font-weight: 600; text-align: right; font-size: 14px;">${data.tariffName}</td>
            </tr>
            ${data.cups ? `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">CUPS</td>
                <td style="padding: 10px 0; font-weight: 600; text-align: right; font-size: 14px; font-family: monospace;">${data.cups}</td>
            </tr>` : ''}
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Valor Mensual Estimado</td>
                <td style="padding: 10px 0; font-weight: 700; text-align: right; font-size: 16px; color: #2563eb;">${monthlyFormatted} EUR</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Fecha de Firma</td>
                <td style="padding: 10px 0; font-weight: 600; text-align: right; font-size: 14px;">${data.signedAt}</td>
            </tr>
        </table>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 24px;">
            De acuerdo con la normativa vigente (Real Decreto 1435/2002 y regulacion de la CNMC),
            usted dispone de un plazo de <strong>14 dias naturales</strong> desde la firma para ejercer
            su derecho de desistimiento sin penalizacion alguna.
        </p>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            Para cualquier consulta, no dude en ponerse en contacto con nosotros.
        </p>

        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
            Este mensaje ha sido generado automaticamente por el sistema de gestion de contratos.
        </p>
    </div>
</div>`.trim()
}

function buildWhatsAppText(
    data: ContractNotificationData,
    monthlyFormatted: string
): string {
    return [
        `*Contrato de Suministro Registrado*`,
        `Ref: ${data.contractNumber}`,
        ``,
        `Estimado/a ${data.customerName},`,
        ``,
        `Su contrato ha sido registrado correctamente:`,
        ``,
        `- Comercializadora: ${data.supplierName}`,
        `- Tarifa: ${data.tariffName}`,
        data.cups ? `- CUPS: ${data.cups}` : null,
        `- Valor mensual: ${monthlyFormatted} EUR`,
        `- Fecha firma: ${data.signedAt}`,
        ``,
        `Dispone de 14 dias naturales para ejercer su derecho de desistimiento.`,
        ``,
        `Para consultas, contacte con nosotros.`,
    ].filter(Boolean).join('\n')
}
