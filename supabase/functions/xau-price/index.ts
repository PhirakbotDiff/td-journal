// Supabase Edge Function: returns the current XAU/USD (gold) spot price.
// Keeps the Twelve Data API key server-side — never expose it in client code.
//
// Deploy:
//   supabase functions deploy xau-price
//   supabase secrets set TWELVE_DATA_API_KEY=your-key-here
//
// Requires a signed-in Supabase session to call (default JWT verification
// stays on), matching how every other table in this app is scoped to the
// signed-in user.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const TWELVE_DATA_API_KEY = Deno.env.get('TWELVE_DATA_API_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (!TWELVE_DATA_API_KEY) {
    return json({ error: 'Price feed is not configured (missing TWELVE_DATA_API_KEY).' }, 500)
  }

  try {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=XAU/USD&apikey=${TWELVE_DATA_API_KEY}`,
    )
    const data = await res.json()
    const price = Number(data?.price)

    if (!res.ok || !Number.isFinite(price)) {
      return json({ error: data?.message ?? 'Price lookup failed.' }, 502)
    }

    return json({ price })
  } catch {
    return json({ error: 'Price lookup failed.' }, 502)
  }
})
