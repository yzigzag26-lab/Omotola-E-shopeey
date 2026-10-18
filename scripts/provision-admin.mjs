#!/usr/bin/env node
/**
 * Provisions (or updates) the administrator account using the Supabase Admin API.
 * The password is read from the environment and is never written to disk or logs.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   ADMIN_EMAIL=omojuli001@gmail.com ADMIN_INITIAL_PASSWORD='choose-a-strong-password' \
 *   npm run provision-admin
 *
 * To have a strong password generated and printed once:
 *   ADMIN_INITIAL_PASSWORD=--generate npm run provision-admin
 */
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { adminClient, requireEnv } from "./_supabase.mjs";

const MIN_LENGTH = 12;

/** Deliberately small: catches the passwords that actually get reused. */
const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "123456", "12345678", "123456789",
  "qwerty", "qwerty123", "admin", "admin123", "administrator", "letmein", "welcome",
  "welcome1", "iloveyou", "abc123", "corazon", "corazonempire", "changeme", "supabase",
]);

/** Returns the list of unmet requirements; empty means the password is acceptable. */
export function passwordProblems(password) {
  const problems = [];
  if (password.length < MIN_LENGTH) problems.push(`at least ${MIN_LENGTH} characters (got ${password.length})`);
  if (!/[a-z]/.test(password)) problems.push("a lowercase letter");
  if (!/[A-Z]/.test(password)) problems.push("an uppercase letter");
  if (!/\d/.test(password)) problems.push("a digit");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("a symbol");
  if (/\s/.test(password)) problems.push("no spaces");
  const normalised = password.toLowerCase();
  if (COMMON.has(normalised)) problems.push("not a commonly used password");
  if (/(.)\1{3,}/.test(password)) problems.push("no character repeated 4+ times");
  const sequential = ["abcdefgh", "12345678", "qwertyui", "password"];
  if (sequential.some((run) => normalised.includes(run))) problems.push("no keyboard or alphabet runs");
  return problems;
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGIT = "23456789";
const SYMBOL = "!@#$%^&*-_=+?";
const ALPHABET = `${UPPER}${LOWER}${DIGIT}${SYMBOL}`;
const PASSWORD_LENGTH = 20;

function candidate() {
  const classes = [UPPER, LOWER, DIGIT, SYMBOL];
  const bytes = randomBytes(PASSWORD_LENGTH * 2);
  // Seed one character from each required class, then fill from the full alphabet.
  const characters = classes.map((set, index) => set[bytes[index] % set.length]);
  for (let index = classes.length; index < PASSWORD_LENGTH; index += 1) {
    characters.push(ALPHABET[bytes[index] % ALPHABET.length]);
  }
  // Shuffle so the guaranteed characters are not always in the first four slots.
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = bytes[PASSWORD_LENGTH + index] % (index + 1);
    [characters[index], characters[swap]] = [characters[swap], characters[index]];
  }
  return characters.join("");
}

/**
 * 20 characters, generated locally and never stored. Guaranteed to satisfy
 * passwordProblems: candidates are rejected and redrawn until they do, so a
 * caller can never be handed a password its own policy would refuse.
 */
export function generatePassword() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const password = candidate();
    if (passwordProblems(password).length === 0) return password;
  }
  throw new Error("Could not generate a password that satisfies the policy.");
}

async function main() {
  requireEnv(["ADMIN_EMAIL", "ADMIN_INITIAL_PASSWORD"]);
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const generate = process.env.ADMIN_INITIAL_PASSWORD.trim() === "--generate";
  const password = generate ? generatePassword() : process.env.ADMIN_INITIAL_PASSWORD;

  const problems = passwordProblems(password);
  if (problems.length > 0) {
    console.error("ADMIN_INITIAL_PASSWORD is too weak. It needs:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("\nGenerate one with:  ADMIN_INITIAL_PASSWORD=--generate npm run provision-admin");
    console.error("Or locally with:    openssl rand -base64 18");
    process.exit(1);
  }

  const supabase = adminClient();

  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw new Error(listError.message);
  const user = existing.users.find((candidate) => candidate.email?.toLowerCase() === email);

  let userId;
  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      app_metadata: { ...(user.app_metadata ?? {}), role: "admin" },
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
    console.log(`Updated existing account ${email}.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
    console.log(`Created administrator ${email}.`);
  }

  const { error: allowError } = await supabase
    .from("admin_users")
    .upsert({ user_id: userId, email }, { onConflict: "user_id" });
  if (allowError) throw new Error(allowError.message);

  if (generate) {
    // The only place a password is ever printed — the operator's own terminal.
    console.log(`\nGenerated password (shown once, not stored anywhere):\n  ${password}`);
  }
  console.log("\nAdministrator allow-list entry is present. Sign in at /admin and change the password.");
}

// Runs only when executed directly, so the policy helpers stay importable by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("\nProvisioning failed:", error.message);
    process.exit(1);
  });
}
