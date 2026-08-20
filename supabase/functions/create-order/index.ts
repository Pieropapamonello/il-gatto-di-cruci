import { createClient } from 'npm:@supabase/supabase-js@2'

const allowedOrigins = new Set(['https://il-gatto-di-cruci.onrender.com'])
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'null',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
  'Content-Type': 'application/json',
})

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
const euro = (value: unknown) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value || 0))

async function sendCloudflareEmail(to: string, subject: string, text: string, html: string) {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
  const token = Deno.env.get('CLOUDFLARE_EMAIL_API_TOKEN')
  const from = Deno.env.get('CLOUDFLARE_EMAIL_FROM')
  if (!accountId || !token || !from) return false
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, from: { address: from, name: 'Il Gatto di Cruci' }, subject, text, html, reply_to: from }),
    signal: AbortSignal.timeout(10000),
  })
  return response.ok
}

async function sendOrderEmails(order: any, customer: { name: string, email: string, address: string }) {
  const adminEmail = Deno.env.get('ORDER_NOTIFICATION_EMAIL')
  if (!adminEmail || !customer.email) return
  const items = Array.isArray(order?.items) ? order.items : []
  const articleTotal = items.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
  const shipping = Math.max(0, Number(order?.total || 0) - articleTotal)
  const lines = items.map((item: any) => `${item.name}${item.variant ? ` — Variante: ${item.variant}` : ''}\n${item.quantity} × ${euro(item.price)} = ${euro(Number(item.price || 0) * Number(item.quantity || 0))}`).join('\n\n')
  const htmlItems = items.map((item: any) => `<li><b>${escapeHtml(item.name)}</b>${item.variant ? `<br>Variante: ${escapeHtml(item.variant)}` : ''}<br>${escapeHtml(item.quantity)} × ${escapeHtml(euro(item.price))} = ${escapeHtml(euro(Number(item.price || 0) * Number(item.quantity || 0)))}</li>`).join('')
  const shippingName = shipping === 3.9 ? 'InPost — punto ritiro' : shipping === 6.9 ? 'Consegna a domicilio' : 'Spedizione'
  const orderNumber = escapeHtml(order?.order_number || '')
  const customerText = `Cliente: ${customer.name}\nEmail: ${customer.email}\nIndirizzo: ${customer.address}`
  const customerHtml = `<h1>Grazie per il tuo ordine</h1><p>Abbiamo registrato l'ordine <b>#${orderNumber}</b>. Ti contatteremo per confermarlo.</p><h2>Riepilogo</h2><ul>${htmlItems}</ul><p>Articoli: <b>${escapeHtml(euro(articleTotal))}</b><br>${escapeHtml(shippingName)}: <b>${escapeHtml(euro(shipping))}</b><br>Totale: <b>${escapeHtml(euro(order?.total))}</b></p>`
  const adminHtml = `<h1>Nuovo ordine #${orderNumber}</h1><p><b>${escapeHtml(customer.name)}</b><br>${escapeHtml(customer.email)}<br>${escapeHtml(customer.address)}</p><h2>Articoli</h2><ul>${htmlItems}</ul><p>Totale: <b>${escapeHtml(euro(order?.total))}</b></p>`
  await Promise.allSettled([
    sendCloudflareEmail(customer.email, `Conferma ricezione ordine #${order?.order_number || ''}`, `Abbiamo registrato l'ordine #${order?.order_number || ''}.\n\n${lines}\n\n${shippingName}: ${euro(shipping)}\nTotale: ${euro(order?.total)}\n\nTi contatteremo per confermarlo.`, customerHtml),
    sendCloudflareEmail(adminEmail, `Nuovo ordine #${order?.order_number || ''}`, `${customerText}\n\n${lines}\n\n${shippingName}: ${euro(shipping)}\nTotale: ${euro(order?.total)}`, adminHtml),
  ])
}

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
    await sendOrderEmails(data, { name: String(body.customerName || ''), email: String(body.customerEmail || ''), address: String(body.customerAddress || '') })
    return new Response(JSON.stringify({ order: data }), { status: 201, headers: cors(origin) })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Ordine non creato' }), { status: 400, headers: cors(origin) })
  }
})
