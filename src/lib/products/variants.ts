export type ParsedVariant = { kind: string; value: string };

/**
 * Parses the admin variant textarea. One line per kind:
 *   Size: S, M, L
 *   Colour: Burgundy, Ivory
 * A line without a colon is treated as Size values.
 */
export function parseVariants(raw: string | null): ParsedVariant[] {
  if (!raw) return [];
  const out: ParsedVariant[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [maybeKind, rest] = trimmed.includes(":") ? trimmed.split(/:(.*)/s) : ["Size", trimmed];
    const kind = (maybeKind ?? "Size").trim().slice(0, 40) || "Size";
    const values = (rest ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    for (const value of values) {
      if (value.length <= 60) out.push({ kind, value });
    }
  }
  return out.slice(0, 60);
}
