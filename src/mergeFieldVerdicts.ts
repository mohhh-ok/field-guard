import { createVerdict, FieldVerdict } from "./types.js";

export type MergeFieldVerdictsMode = "union" | "intersection";

export function mergeFieldVerdicts<F extends string>(
  mode: MergeFieldVerdictsMode,
  verdicts: FieldVerdict<F>[],
  fields: F[],
): FieldVerdict<F> {
  if (verdicts.length === 0) {
    return createVerdict<F>([]);
  }

  const allowedSets = verdicts.map((v) => new Set(v.allowedFields));

  const allowedFields = mode === "union"
    ? fields.filter((f) => allowedSets.some((set) => set.has(f)))
    : fields.filter((f) => allowedSets.every((set) => set.has(f)));

  return createVerdict(allowedFields);
}
