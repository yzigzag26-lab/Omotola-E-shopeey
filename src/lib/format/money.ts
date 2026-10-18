/**
 * All monetary values are integers in kobo (₦1 = 100 kobo).
 * Never use floating point for arithmetic on money.
 */

const nairaWhole = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const nairaFraction = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function assertKobo(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`Invalid kobo amount: ${String(value)}`);
  }
}

/** Formats kobo for display, e.g. 1850000 -> "₦18,500". */
export function formatMoney(kobo: number): string {
  assertKobo(kobo);
  return kobo % 100 === 0 ? nairaWhole.format(kobo / 100) : nairaFraction.format(kobo / 100);
}

/** Plain naira string for admin inputs, e.g. 1850000 -> "18500.00". */
export function koboToNairaInput(kobo: number): string {
  assertKobo(kobo);
  return (kobo / 100).toFixed(2);
}

const NAIRA_PATTERN = /^\d{1,9}(?:\.\d{1,2})?$/;

/**
 * Parses a naira input ("18,500.50", "₦18500", "18500.5") into kobo.
 * Returns null for anything ambiguous or out of range.
 */
export function parseNairaToKobo(raw: string): number | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/^₦/, "").replace(/,/g, "").replace(/\s/g, "");
  if (!NAIRA_PATTERN.test(cleaned)) return null;
  const [wholePart, fractionPart = ""] = cleaned.split(".");
  const whole = Number(wholePart);
  if (!Number.isSafeInteger(whole)) return null;
  const fraction = Number((fractionPart + "00").slice(0, 2));
  const kobo = whole * 100 + fraction;
  if (!Number.isSafeInteger(kobo) || kobo > 100_000_000_00) return null;
  return kobo;
}

export function lineTotal(unitPriceKobo: number, quantity: number): number {
  assertKobo(unitPriceKobo);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new RangeError(`Invalid quantity: ${quantity}`);
  }
  return unitPriceKobo * quantity;
}
