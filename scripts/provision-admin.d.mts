/** Types for scripts/provision-admin.mjs so the password policy stays testable from TypeScript. */

/** Unmet requirements for a candidate password; empty means acceptable. */
export function passwordProblems(password: string): string[];

/** A 20-character password that always satisfies passwordProblems. */
export function generatePassword(): string;
