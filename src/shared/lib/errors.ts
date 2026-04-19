/**
 * Maps Supabase/PostgreSQL technical errors to user-friendly Spanish messages.
 */

interface SupabaseError {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
}

const PG_ERROR_MESSAGES: Record<string, string> = {
    '23505': 'Ya existe un registro con estos datos. Comprueba si ya lo has creado antes.',
    '23502': 'Faltan datos obligatorios. Revisa que todos los campos requeridos estén completos.',
    '23503': 'No se puede realizar esta acción porque hay registros relacionados que lo impiden.',
    '23514': 'Los datos introducidos no son válidos. Revisa los valores e inténtalo de nuevo.',
    '42501': 'No tienes permisos para realizar esta acción.',
    '42P01': 'Error de configuración interna. Contacta con soporte.',
    'PGRST116': 'No se encontró el registro solicitado.',
    'PGRST204': 'La operación no devolvió datos. Puede que el registro no exista o no tengas acceso.',
    'PGRST301': 'Tu sesión ha expirado. Por favor, recarga la página e inicia sesión de nuevo.',
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
    'invalid_credentials': 'Email o contraseña incorrectos.',
    'email_not_confirmed': 'Tu cuenta no ha sido verificada. Revisa tu correo electrónico.',
    'user_not_found': 'No existe ninguna cuenta con ese email.',
    'over_request_rate_limit': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    'session_not_found': 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.',
};

export function getErrorMessage(err: unknown): string {
    if (!err) return 'Ha ocurrido un error inesperado.';

    const error = err as SupabaseError & { status?: number; error?: string; __isAuthError?: boolean };

    // Auth errors from Supabase
    if (error.__isAuthError && error.message) {
        const normalized = error.message.toLowerCase().replace(/\s+/g, '_');
        for (const [key, msg] of Object.entries(AUTH_ERROR_MESSAGES)) {
            if (normalized.includes(key)) return msg;
        }
        return error.message;
    }

    // PostgreSQL/PostgREST errors by code
    if (error.code && PG_ERROR_MESSAGES[error.code]) {
        return PG_ERROR_MESSAGES[error.code];
    }

    // Network/fetch errors
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
        return 'No se pudo conectar al servidor. Comprueba tu conexión a internet.';
    }

    // Edge function HTTP errors
    if (error.status === 524 || error.status === 546) {
        return 'La operación tardó demasiado. Inténtalo de nuevo.';
    }
    if (error.status === 401) {
        return 'Tu sesión ha expirado. Por favor, recarga la página e inicia sesión de nuevo.';
    }
    if (error.status === 403) {
        return 'No tienes permisos para realizar esta acción.';
    }
    if (error.status === 413) {
        return 'El archivo es demasiado grande. El tamaño máximo permitido es 10 MB.';
    }
    if (error.status && error.status >= 500) {
        return 'Error interno del servidor. Inténtalo de nuevo en unos momentos.';
    }

    // Messages that are already user-friendly (in Spanish or short)
    const msg = (err instanceof Error ? err.message : error.message) ?? '';
    if (msg && !msg.includes('undefined') && !msg.includes('null') && !looksLikeTechnical(msg)) {
        return msg;
    }

    return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
}

function looksLikeTechnical(msg: string): boolean {
    const technicalPatterns = [
        /duplicate key/i,
        /violates.*constraint/i,
        /column .* of relation/i,
        /relation .* does not exist/i,
        /permission denied/i,
        /syntax error/i,
        /invalid input syntax/i,
        /foreign key/i,
        /not-null constraint/i,
        /pgrst/i,
        /supabase/i,
        /postgrest/i,
        /json/i,
        /unexpected token/i,
    ];
    return technicalPatterns.some(p => p.test(msg));
}
