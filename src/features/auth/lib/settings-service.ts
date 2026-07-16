import { supabase } from '@/shared/lib/supabase'

export interface MessagingSettings {
    google_refresh_token?: string;
    google_access_token?: string;
    email_from?: string;
}

interface EmailFromSettings {
    email_from?: string;
}

interface OAuthTokenRow {
    refresh_token: string;
    access_token: string | null;
    email: string | null;
}

async function getAuthUserCompany(): Promise<{ companyId: string; role: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .maybeSingle();

    if (userError || !userData?.company_id) throw new Error('Company not found');
    return { companyId: userData.company_id, role: userData.role };
}

export async function getCompanySettings(): Promise<MessagingSettings> {
    const { companyId } = await getAuthUserCompany();

    // Fetch WhatsApp settings from companies table
    const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('messaging_settings')
        .eq('id', companyId)
        .single();

    if (companyError) throw companyError;

    const emailSettings = (companyData.messaging_settings ?? {}) as EmailFromSettings;

    // Fetch OAuth tokens from secure table (RLS restricts to admin/manager)
    const { data: tokenData, error: tokenError } = await supabase
        .from('company_oauth_tokens')
        .select('refresh_token, access_token, email')
        .eq('company_id', companyId)
        .maybeSingle();

    // tokenError with code PGRST116 means no row found — not a real error
    if (tokenError && tokenError.code !== 'PGRST116') {
        console.error('Error fetching OAuth tokens:', tokenError);
    }

    const oauthRow = tokenData as OAuthTokenRow | null;

    return {
        google_refresh_token: oauthRow?.refresh_token ?? '',
        google_access_token: oauthRow?.access_token ?? '',
        email_from: oauthRow?.email ?? emailSettings.email_from ?? '',
    };
}

export async function updateCompanySettings(settings: MessagingSettings) {
    const { companyId, role } = await getAuthUserCompany();

    if (role !== 'admin' && role !== 'manager') {
        throw new Error('Only admins or managers can update company settings');
    }

    // 1. Update email_from in companies.messaging_settings
    // Fetch existing JSONB first to avoid overwriting other fields in the object
    const { data: currentCompany } = await supabase
        .from('companies')
        .select('messaging_settings')
        .eq('id', companyId)
        .single();

    const merged = {
        ...(currentCompany?.messaging_settings as Record<string, unknown> ?? {}),
        email_from: settings.email_from,
    };

    const { error: updateError } = await supabase
        .from('companies')
        .update({ messaging_settings: merged })
        .eq('id', companyId);

    if (updateError) throw updateError;

    // 2. Upsert OAuth tokens in secure table
    const hasRefreshToken = settings.google_refresh_token && settings.google_refresh_token.length > 0;

    if (hasRefreshToken) {
        const { error: tokenError } = await supabase
            .from('company_oauth_tokens')
            .upsert({
                company_id: companyId,
                provider: 'google',
                refresh_token: settings.google_refresh_token,
                access_token: settings.google_access_token ?? null,
                email: settings.email_from ?? null,
            }, { onConflict: 'company_id' });

        if (tokenError) throw tokenError;
    } else {
        // If refresh token is cleared, remove the row
        const { error: deleteError } = await supabase
            .from('company_oauth_tokens')
            .delete()
            .eq('company_id', companyId);

        if (deleteError) throw deleteError;
    }
}
