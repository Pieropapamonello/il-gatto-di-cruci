import { createClient } from 'npm:@supabase/supabase-js@2'

const allowedOrigins = new Set(['https://il-gatto-di-cruci.onrender.com'])
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'null',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
  'Content-Type': 'application/json',
})

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) })
  if (request.method !== 'POST' || !origin || !allowedOrigins.has(origin)) return new Response(JSON.stringify({ error: 'Richiesta non consentita' }), { status: 403, headers: cors(origin) })
  try {
    const body = await request.json()
    const token = body?.turnstileToken
    if (typeof token !== 'string' || token.length < 20 || token.length > 2048) throw new Error('Verifica anti-bot non valida')
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: Deno.env.get('TURNSTILE_SECRET') || '', response: token }), signal: AbortSignal.timeout(10000),
    })
    const check = await verify.json()
    if (!verify.ok || !check.success || check.action !== 'checkout' || check.hostname !== 'il-gatto-di-cruci.onrender.com') throw new Error('Verifica anti-bot non riuscita')
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data, error } = await admin.rpc('create_checkout_order', {
      p_customer_name: body.customerName, p_customer_email: body.customerEmail, p_customer_address: body.customerAddress,
      p_shipping_method: body.shippingMethod, p_items: body.items,
    })
    if (error) throw new Error(error.message)
    return new Response(JSON.stringify({ order: data }), { status: 201, headers: cors(origin) })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Ordine non creato' }), { status: 400, headers: cors(origin) })
  }
})
