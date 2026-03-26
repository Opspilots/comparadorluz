// Production origins are always allowed; localhost only in development
const PRODUCTION_ORIGINS = [
  'https://comparadorluz.vercel.app',
]

const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
]

function getAllowedOrigins(): string[] {
  // Allow extra origins via env var (comma-separated)
  const extra = Deno.env.get('ALLOWED_ORIGINS')
  const extraOrigins = extra ? extra.split(',').map(o => o.trim()).filter(Boolean) : []

  const isDev = Deno.env.get('ENVIRONMENT') !== 'production'
  return [...PRODUCTION_ORIGINS, ...extraOrigins, ...(isDev ? DEV_ORIGINS : [])]
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get('Origin') || ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  }

  // Only reflect Access-Control-Allow-Origin for allowed origins
  if (getAllowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

export function getCorsHeadersWithExtra(req?: Request, extraHeaders?: string): Record<string, string> {
  const base = getCorsHeaders(req)
  if (extraHeaders) {
    base['Access-Control-Allow-Headers'] += `, ${extraHeaders}`
  }
  return base
}
