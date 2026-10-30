export const FAMILY_CAPACITY = 4;
export const FAMILY_INVITE_DAYS = 7;
export const FAMILY_PRICES = {
  yearly: { id: 'faunex_premium_family_yearly', amount: 6000 },
  monthly: { id: 'faunex_premium_family_monthly', amount: 600 },
} as const;
export function isFamilyPrice(value: unknown): boolean {
  return Object.values(FAMILY_PRICES).some(price => price.id === value);
}