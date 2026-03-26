import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * Simple rate limiter using Supabase table.
 * Tracks requests per company_id per action within a sliding window.
 *
 * Requires migration: 20260322100100_create_rate_limits_table.sql
 */

interface RateLimitConfig {
  /** Unique action identifier (e.g., 'send-message', 'parse-tariff') */
  action: string
  /** Company UUID for tenant-scoped limits */
  companyId: string
  /** Max requests allowed within the window */
  maxRequests: number
  /** Window size in seconds (default: 3600 = 1 hour) */
  windowSeconds?: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: string
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { action, companyId, maxRequests, windowSeconds = 3600 } = config

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()
  const resetAt = new Date(Date.now() + windowSeconds * 1000).toISOString()

  // Count requests in current window
  const { count, error: countError } = await supabaseClient
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('action', action)
    .gte('created_at', windowStart)

  if (countError) {
    console.error('Rate limit check failed:', countError)
    // Fail closed — deny request on error for safety
    return { allowed: false, remaining: 0, resetAt }
  }

  const currentCount = count ?? 0
  const remaining = Math.max(0, maxRequests - currentCount)
  const allowed = currentCount < maxRequests

  if (allowed) {
    // Record this request
    await supabaseClient
      .from('rate_limits')
      .insert({ company_id: companyId, action })
  }

  return { allowed, remaining, resetAt }
}

/**
 * Returns a 429 Too Many Requests response with standard headers
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.',
      retryAfter: result.resetAt,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': result.resetAt,
        'X-RateLimit-Remaining': String(result.remaining),
      },
    }
  )
}
