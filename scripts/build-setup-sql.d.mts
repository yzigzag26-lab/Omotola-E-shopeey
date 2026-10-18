/** Types for scripts/build-setup-sql.mjs so the one-paste file stays testable from TypeScript. */

export type SetupSource = {
  /** Banner heading written above the file's contents. */
  title: string;
  /** Repository-relative path of a migration or seed file. */
  relativePath: string;
};

/** Migration and seed files, in the order they must be applied. */
export const SOURCES: SetupSource[];

/** Repository-relative path of the generated file. */
export const SETUP_SQL_RELATIVE_PATH: string;

/** The administrator address the STEP 2 block grants. */
export const ADMIN_EMAIL: string;

/** Builds the complete file from the sources on disk. */
export function buildSetupSql(root?: string): string;

/**
 * Null when the committed file matches the sources; otherwise a one-line
 * explanation naming the first differing line.
 */
export function driftDescription(expected: string, actual: string): string | null;
