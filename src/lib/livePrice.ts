import { supabase } from './supabaseClient'
import { isXauSymbol } from './instruments'

export { isXauSymbol }

export async function fetchXauPrice(): Promise<number> {
  const { data, error } = await supabase.functions.invoke<{ price?: number; error?: string }>(
    'xau-price',
  )
  if (error) throw new Error(error.message)
  if (typeof data?.price !== 'number') throw new Error(data?.error ?? 'Price unavailable')
  return data.price
}
