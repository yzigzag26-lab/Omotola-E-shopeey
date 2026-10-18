#!/usr/bin/env node
/**
 * Secret scanner for git-tracked files.
 *
 * Fails when a real-looking credential appears in a file that is committed to
 * the repository. Placeholders such as `your-publishable-or-anon-key` are
 * allowed; live values are not.
 *
 * Usage:
 *   npm run lint:secrets            # scan tracked files
 *   node scripts/check-secrets.mjs --staged   # scan staged files only (pre-commit)
 *
 * Values are never printed. Only the file, the line number and the rule name
 * are reported, so running this in CI cannot leak the credential it finds.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Rules ordered so the most specific match wins. */
export const RULES = [
  {
    name: "supabase-service-role-jwt",
    pattern: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
    describe: (match) => decodeJwtClaims(match),
  },
  { name: "resend-api-key", pattern: /\bre_[A-Za-z0-9_]{16,}\b/g },
  { name: "aws-access-key-id", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { name: "private-key-block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  {
    name: "assigned-credential",
    // Lookbehind, not \b: a leading \b cannot match after "_", so prefixed
    // names such as ORDER_API_TOKEN or SUPABASE_SERVICE_ROLE_KEY were skipped.
    pattern:
      /(?<![A-Za-z0-9])(?:SERVICE_ROLE[A-Z_]*|SECRET_KEY|API_KEY|APIKEY|(?:API|ACCESS|AUTH)_TOKEN|PASSWORD|PASSWD)\s*[:=]\s*["']?([^\s"',;]{20,})["']?/gi,
    group: 1,
    /**
     * The broad rule above also matches ordinary code (`process.env.X?.trim()`,
     * zod schemas, docstring examples). A finding only counts when the assigned
     * literal actually looks like a credential rather than a code expression.
     */
    qualifies: (value) => {
      if (/[()[\]{}?]|=>|process\.env|require\(|\.\w+\(/.test(value)) return false;
      return /\d/.test(value) && /[A-Za-z]/.test(value);
    },
  },
];

/** Placeholder text that is obviously not a live credential. */
const PLACEHOLDER = /your[-_]|example|placeholder|changeme|redacted|xxxx|\$\{|<[a-z-]+>|\.\.\.|dummy|test-key/i;

function decodeJwtClaims(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    const role = payload.role ? `role=${payload.role}` : "role=unknown";
    const ref = payload.ref ? ` ref=${payload.ref}` : "";
    return `${role}${ref}`;
  } catch {
    return "undecodable token";
  }
}

/**
 * Findings for one line of one file.
 *
 * A single credential can satisfy more than one rule (a service-role JWT is
 * both a JWT and an assigned credential). Candidates are collected with their
 * span, then deduped so the earliest-declared — most specific — rule wins and
 * one leaked value is reported once.
 */
export function scanLine(file, lineNumber, line) {
  const candidates = [];
  RULES.forEach((rule, priority) => {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(line)) !== null) {
      const value = rule.group ? match[rule.group] : match[0];
      const qualifies = !PLACEHOLDER.test(value) && (!rule.qualifies || rule.qualifies(value));
      if (qualifies) {
        candidates.push({
          priority,
          start: match.index,
          end: match.index + match[0].length,
          finding: {
            file,
            line: lineNumber,
            rule: rule.name,
            detail: rule.describe ? rule.describe(match[0]) : undefined,
          },
        });
      }
      if (rule.pattern.lastIndex === match.index) rule.pattern.lastIndex += 1;
    }
  });

  candidates.sort((a, b) => a.priority - b.priority || a.start - b.start);
  const kept = [];
  for (const candidate of candidates) {
    const overlaps = kept.some((other) => candidate.start < other.end && candidate.end > other.start);
    if (!overlaps) kept.push(candidate);
  }
  return kept.map((candidate) => candidate.finding);
}

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json", ".sql", ".md", ".mdx",
  ".yml", ".yaml", ".css", ".html", ".txt", ".env", ".example", ".toml", ".sh", ".svg",
]);

function isTextFile(file) {
  if (file.startsWith(".env")) return true;
  return TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) || !path.extname(file);
}

function gitFiles(staged) {
  const args = staged
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]
    : ["ls-files", "--cached", "--others", "--exclude-standard"];
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Scan a list of files and return all findings. Missing files are skipped. */
export function scanFiles(files) {
  const findings = [];
  for (const file of files) {
    if (!isTextFile(file)) continue;
    let contents;
    try {
      contents = readFileSync(file, "utf8");
    } catch {
      continue; // deleted or unreadable — nothing to scan
    }
    if (contents.includes("\u0000")) continue; // binary
    contents.split("\n").forEach((line, index) => {
      findings.push(...scanLine(file, index + 1, line));
    });
  }
  return findings;
}

function report(findings, filesScanned) {
  if (findings.length === 0) {
    console.log(`✓ No credentials found in ${filesScanned} tracked file(s).`);
    return;
  }
  console.error(`✗ Found ${findings.length} credential-like value(s) in committed files:\n`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line}  ${finding.rule}${finding.detail ? ` (${finding.detail})` : ""}`);
  }
  console.error("\nThese values are not printed above on purpose.");
  console.error("Remove them from the file and history, then rotate the credential — it must be");
  console.error("assumed compromised. Secrets belong in the hosting platform's environment");
  console.error("variables or a gitignored .env.local, never in the repository.");
  console.error("See .env.example and docs/SETUP.md.");
}

function main() {
  const staged = process.argv.includes("--staged");
  const files = gitFiles(staged);
  const findings = scanFiles(files);
  report(findings, files.length);
  process.exit(findings.length === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
