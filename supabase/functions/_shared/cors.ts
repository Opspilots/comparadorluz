const ALLOWED_ORIGINS = [
  'https://comparadorluz.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get('Origin') || ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Only reflect Access-Control-Allow-Origin for allowed origins
  if (ALLOWED_ORIGINS.includes(origin)) {
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
