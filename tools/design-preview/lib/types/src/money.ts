/**
 * Money is always stored/passed as integer minor units (agorot) + an ISO
 * currency code — never a float. See /docs/05-DATABASE.md.
 */
export interface Money {
  minorUnits: number; // e.g. 17900 = ₪179.00
  currency: "ILS" | "USD" | "EUR";
}

export function money(minorUnits: number, currency: Money["currency"] = "ILS"): Money {
  if (!Number.isInteger(minorUnits)) {
    throw new Error(`Money.minorUnits must be an integer, got ${minorUnits}`);
  }
  return { minorUnits, currency };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} vs ${b.currency}`);
  }
  return money(a.minorUnits + b.minorUnits, a.currency);
}

export function formatMoney(m: Money, locale: string = "he-IL"): string {
  const major = m.minorUnits / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
    maximumFractionDigits: major % 1 === 0 ? 0 : 2,
  }).format(major);
}
