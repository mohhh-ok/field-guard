import { createVerdict, FieldVerdict } from "./types.js";

/**
 * フィールド判定のマージモード。
 *
 * - `"union"` — いずれかの判定で許可されていればフィールドを許可する（和集合）
 * - `"intersection"` — すべての判定で許可されている場合のみフィールドを許可する（積集合）
 */
export type MergeFieldVerdictsMode = "union" | "intersection";

/**
 * 複数の {@link FieldVerdict} を指定されたモードでマージし、単一の判定結果を返す。
 *
 * - `"union"` モード: いずれかの判定が許可しているフィールドを許可する
 * - `"intersection"` モード: すべての判定が許可しているフィールドのみ許可する
 * - `verdicts` が空の場合、許可フィールドなしの判定を返す
 *
 * @typeParam F - フィールド名を表す文字列リテラル型
 * @param mode - マージモード（`"union"` または `"intersection"`）
 * @param verdicts - マージ対象の判定結果の配列
 * @param fields - 判定対象となるフィールドの全体集合
 * @returns マージされた単一の {@link FieldVerdict}
 */
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
