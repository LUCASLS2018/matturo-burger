/** Category whose items keep their own promotional price and never receive the site-wide discount. */
export const PROMO_CATEGORY = "promocoes";
/** Applies the site-wide percentage discount to a price in euros, except promotion items. */
export function discountedPrice(price: number, category: string, percent: number): number {
  if (!percent || category === PROMO_CATEGORY) return price;
  return Math.round(price * (100 - percent)) / 100;
}
