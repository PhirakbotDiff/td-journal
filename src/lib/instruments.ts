export function isXauSymbol(symbol: string): boolean {
  return /^xau/i.test(symbol.trim())
}

// Gold is conventionally traded in lots rather than 1:1 units — a mini lot
// (10 oz) moves $10 for every $1 change in spot price.
export const XAU_POINT_VALUE = 10
