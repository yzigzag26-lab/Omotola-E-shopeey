/** Types for scripts/check-secrets.mjs so the scanner stays testable from TypeScript. */
export type Finding = {
  file: string;
  line: number;
  rule: string;
  detail?: string;
};

export type Rule = {
  name: string;
  pattern: RegExp;
  /** Capture group holding the credential; defaults to the whole match. */
  group?: number;
  /** Extra test the captured value must pass before it counts as a finding. */
  qualifies?: (value: string) => boolean;
  /** Non-secret summary shown instead of the credential. */
  describe?: (match: string) => string;
};

export const RULES: Rule[];

export function scanLine(file: string, lineNumber: number, line: string): Finding[];
export function scanFiles(files: string[]): Finding[];
