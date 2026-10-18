import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { scanFiles, scanLine } from "../scripts/check-secrets.mjs";

/**
 * Fixtures are assembled at runtime on purpose: a literal credential in this
 * file would be committed, and the scanner would (correctly) flag it.
 */
const fakeResendKey = `re_${"D".repeat(24)}`;
// No "xxxx" run here: the scanner treats that as a placeholder marker.
const fakeSignature = `${"Zk9".repeat(10)}Qw`;
const jwtWith = (claims: Record<string, unknown>) => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}.${fakeSignature}`;
};
const fakeAwsKey = `AKIA${"Q".repeat(16)}`;
const privateKeyMarker = `-----BEGIN ${"RSA "}PRIVATE KEY-----`;
// Split so this source file never contains a complete credential-shaped literal.
const fakeToken = ["9f3Kd82L", "mQ71ZxA4bNc6Eg"].join("");

const line = (text: string) => scanLine("fixture.ts", 1, text);
const rules = (text: string) => line(text).map((finding) => finding.rule);

describe("secret scanner", () => {
  it("flags a Resend API key", () => {
    expect(rules(`RESEND_API_KEY=${fakeResendKey}`)).toContain("resend-api-key");
  });

  it("flags a service-role JWT and reports its role, not the token", () => {
    const findings = line(`SUPABASE_SERVICE_ROLE_KEY=${jwtWith({ iss: "supabase", ref: "abc", role: "service_role" })}`);
    expect(findings).toHaveLength(1);
    const [first] = findings;
    expect(first?.rule).toBe("supabase-service-role-jwt");
    expect(first?.detail).toBe("role=service_role ref=abc");
    expect(JSON.stringify(findings)).not.toContain(fakeSignature);
  });

  it("flags AWS keys and private key blocks", () => {
    expect(rules(`aws_key_id = ${fakeAwsKey}`)).toContain("aws-access-key-id");
    expect(rules(privateKeyMarker)).toContain("private-key-block");
  });

  it("flags an assigned credential that looks like a real value", () => {
    expect(rules(`ORDER_API_TOKEN="${fakeToken}"`)).toContain("assigned-credential");
  });

  it("ignores placeholders, code and prose", () => {
    expect(line("NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key")).toEqual([]);
    expect(line("RESEND_API_KEY=your-resend-api-key")).toEqual([]);
    expect(line("const apiKey = process.env.RESEND_API_KEY?.trim();")).toEqual([]);
    expect(line("password: z.string().min(1).max(200),")).toEqual([]);
    expect(line("ADMIN_INITIAL_PASSWORD='choose-a-strong-password'")).toEqual([]);
  });

  it("finds nothing in the tracked files of this repository", () => {
    const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
    expect(scanFiles(tracked)).toEqual([]);
  });
});
