import { supabase } from '@/shared/lib/supabase'

export interface MessagingSettings {
    resend_api_key?: string;
    email_from?: string;
    whatsapp_token?: string;
    whatsapp_phone_number_id?: string;
}

export async function getCompanySettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

    if (userError || !userData?.company_id) throw new Error('Company not found');

    const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('messaging_settings')
        .eq('id', userData.company_id)
        .single();

    if (companyError) throw companyError;

    return companyData.messaging_settings as MessagingSettings;
}

export async function updateCompanySettings(settings: MessagingSettings) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single();

    if (userError || !userData?.company_id) throw new Error('Company not found');

    // Safety check for permissions (though RLS should handle this too)
    if (userData.role !== 'admin' && userData.role !== 'manager') {
        throw new Error('Only admins or managers can update company settings');
    }

    const { error: updateError } = await supabase
        .from('companies')
        .update({ messaging_settings: settings })
        .eq('id', userData.company_id);

    if (updateError) throw updateError;
}
