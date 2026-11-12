/** Category whose items keep their own promotional price and never receive the site-wide discount. */
export const PROMO_CATEGORY = "promocoes";
/** A product's own discount wins; otherwise the site-wide discount applies, except to promotion items. */
export function effectiveDiscount(category: string, sitePercent: number, ownPercent = 0): number {
  if (ownPercent > 0) return ownPercent;
  return !sitePercent || category === PROMO_CATEGORY ? 0 : sitePercent;
}
/** Applies the effective percentage discount to a price in euros. */
export function discountedPrice(price: number, category: string, sitePercent: number, ownPercent = 0): number {
  const percent = effectiveDiscount(category, sitePercent, ownPercent);
  if (!percent) return price;
  return Math.round(price * (100 - percent)) / 100;
}
