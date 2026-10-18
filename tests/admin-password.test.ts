import { describe, expect, it } from "vitest";
import { generatePassword, passwordProblems } from "../scripts/provision-admin.mjs";

describe("administrator password policy", () => {
  it("rejects the obvious weak passwords", () => {
    expect(passwordProblems("password").length).toBeGreaterThan(0);
    expect(passwordProblems("Corazon123").length).toBeGreaterThan(0); // no symbol
    expect(passwordProblems("short1!A").length).toBeGreaterThan(0); // too short
    expect(passwordProblems("ALLCAPS1234!").length).toBeGreaterThan(0); // no lowercase
    expect(passwordProblems("aaaaaaaa1234!").length).toBeGreaterThan(0); // repeated character
  });

  it("accepts a strong password", () => {
    expect(passwordProblems("Velvet#Harbour!92")).toEqual([]);
  });

  it("generates a password that always satisfies its own policy", () => {
    for (let index = 0; index < 50; index += 1) {
      const password = generatePassword();
      expect(password).toHaveLength(20);
      expect(passwordProblems(password)).toEqual([]);
    }
  });
});
