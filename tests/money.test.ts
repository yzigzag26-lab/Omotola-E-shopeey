import { describe, expect, it } from "vitest";
import { formatMoney, koboToNairaInput, lineTotal, parseNairaToKobo } from "@/lib/format/money";

describe("money", () => {
  it("formats kobo as naira without decimals for whole amounts", () => {
    expect(formatMoney(1_850_000)).toMatch(/18,500/);
    expect(formatMoney(350_000)).toMatch(/3,500/);
  });

  it("keeps kobo precision when needed", () => {
    expect(formatMoney(1_850_050)).toMatch(/18,500\.50/);
  });

  it("parses the catalogue demo prices exactly", () => {
    const table: [string, number][] = [
      ["18500", 1_850_000],
      ["12,000", 1_200_000],
      ["3,500", 350_000],
      ["5,000", 500_000],
      ["15,000", 1_500_000],
      ["16,500", 1_650_000],
      ["22,000", 2_200_000],
      ["8,500", 850_000],
    ];
    for (const [input, expected] of table) expect(parseNairaToKobo(input)).toBe(expected);
  });

  it("handles currency symbols and fractional naira", () => {
    expect(parseNairaToKobo("₦18,500.25")).toBe(1_850_025);
    expect(parseNairaToKobo(" 18500.5 ")).toBe(1_850_050);
  });

  it("rejects malformed and out-of-range amounts", () => {
    for (const bad of ["", "abc", "-500", "1.234", "1e5", "12,34.5.6"]) {
      expect(parseNairaToKobo(bad)).toBeNull();
    }
  });

  it("round-trips to the admin input format", () => {
    expect(koboToNairaInput(1_850_000)).toBe("18500.00");
  });

  it("computes line totals in kobo", () => {
    expect(lineTotal(1_850_000, 2)).toBe(3_700_000);
    expect(() => lineTotal(1000, 0)).toThrow();
    expect(() => lineTotal(1000, 100)).toThrow();
  });

  it("refuses to format invalid amounts", () => {
    expect(() => formatMoney(-1)).toThrow();
    expect(() => formatMoney(12.5)).toThrow();
  });
});
