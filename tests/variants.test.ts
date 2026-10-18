import { describe, expect, it } from "vitest";
import { parseVariants } from "@/lib/products/variants";

describe("variant parser", () => {
  it("parses kinds and values", () => {
    expect(parseVariants("Size: S, M, L")).toEqual([
      { kind: "Size", value: "S" },
      { kind: "Size", value: "M" },
      { kind: "Size", value: "L" },
    ]);
  });

  it("supports multiple lines and default kind", () => {
    expect(parseVariants("Size: 38, 39\nColour: Burgundy")).toEqual([
      { kind: "Size", value: "38" },
      { kind: "Size", value: "39" },
      { kind: "Colour", value: "Burgundy" },
    ]);
    expect(parseVariants("S, M")).toEqual([
      { kind: "Size", value: "S" },
      { kind: "Size", value: "M" },
    ]);
  });

  it("ignores blanks and trims values", () => {
    expect(parseVariants("").length).toBe(0);
    expect(parseVariants(null).length).toBe(0);
    expect(parseVariants("\n  \nSize:  S ,  , M ")).toEqual([
      { kind: "Size", value: "S" },
      { kind: "Size", value: "M" },
    ]);
  });
});
