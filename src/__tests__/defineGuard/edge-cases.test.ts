import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";
import { createVerdict } from "../../types";
import { mergeFieldVerdicts } from "../../mergeFieldVerdicts";

describe("defineGuard - エッジケース", () => {
  type Context = { userId: string; role: "admin" | "user" };

  test("フィールドが空の配列でも動作する", () => {
    const guard = defineGuard<Context>()({
      fields: [],
      policy: { level: true },
    });

    const result = guard.for({ userId: "1", role: "user" });
    expect(result).toBeDefined();
  });

  test("同じインスタンスで異なるコンテキストを使用できる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email"],
      policy: { level: true },
    })
      .withDerive(({ ctx }) => ({
        userId: ctx.userId,
      }));

    const result1 = guard.for({ userId: "1", role: "user" });
    const result2 = guard.for({ userId: "2", role: "admin" });

    expect(result1.userId).toBe("1");
    expect(result2.userId).toBe("2");
  });

  test("mergeVerdictsで空のflagsを渡すと空の結果が返る", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email"],
      policy: {
        level1: { id: true },
        level2: { email: true },
      },
    })
      .withDerive(({ mergeVerdicts }) => ({
        empty: mergeVerdicts("union", {}),
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.empty.allowedFields).toEqual([]);
  });

  test("mergeVerdictsでintersectionモードで共通部分がない場合は空になる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name"],
      policy: {
        level1: { id: true },
        level2: { email: true },
      },
    })
      .withDerive(({ mergeVerdicts }) => ({
        intersection: mergeVerdicts("intersection", { level1: true, level2: true }),
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.intersection.allowedFields).toEqual([]);
  });

  test("フィールドが1つだけの場合でも正常に動作する", () => {
    const guard = defineGuard<Context>()({
      fields: ["id"],
      policy: { level: true },
    });

    expect(guard.verdictMap.level.allowedFields).toEqual(["id"]);
    expect(guard.verdictMap.level.coversAll(["id"])).toBe(true);
  });

  test("ポリシーの全レベルがfalseの場合、全フィールドが拒否される", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name"],
      policy: {
        level1: false,
        level2: false,
      },
    });

    expect(guard.verdictMap.level1.allowedFields).toEqual([]);
    expect(guard.verdictMap.level2.allowedFields).toEqual([]);
  });

  test("同一フィールドを重複してfieldsに渡した場合の挙動", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "id", "email"],
      policy: { level: true },
    });

    // 重複がそのまま保持される（仕様としての確認）
    expect(guard.fields).toEqual(["id", "id", "email"]);
    // verdictMapでは重複フィールドもallowedFieldsに含まれる
    expect(guard.verdictMap.level.allowedFields).toEqual(["id", "id", "email"]);
  });

  test("ブラックリストモードで全フィールドをfalseにすると全拒否になる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email"],
      policy: {
        level: { id: false, email: false },
      },
    });

    expect(guard.verdictMap.level.allowedFields).toEqual([]);
  });

  test("ホワイトリストモードで全フィールドをtrueにすると全許可になる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email"],
      policy: {
        level: { id: true, email: true },
      },
    });

    expect(guard.verdictMap.level.allowedFields).toEqual(["id", "email"]);
  });

  test("多数のフィールド（50個）でも正常に動作する", () => {
    const fields = Array.from({ length: 50 }, (_, i) => `field${i}`) as `field${number}`[];
    const guard = defineGuard<Context>()({
      fields,
      policy: { level: true },
    });

    expect(guard.verdictMap.level.allowedFields).toHaveLength(50);
    expect(guard.verdictMap.level.coversAll(fields)).toBe(true);
  });

  test("多数のポリシーレベル（10個）でも正常に動作する", () => {
    const policy = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`level${i}`, i % 2 === 0]),
    );
    const guard = defineGuard<Context>()({
      fields: ["id", "email"],
      policy: policy as Record<string, boolean>,
    });

    // 偶数レベルは全許可、奇数レベルは全拒否
    expect(guard.verdictMap["level0" as string].allowedFields).toEqual(["id", "email"]);
    expect(guard.verdictMap["level1" as string].allowedFields).toEqual([]);
  });
});

describe("createVerdict - 直接テスト", () => {
  test("空の配列でverdictを作成できる", () => {
    const verdict = createVerdict<"a" | "b">([]);
    expect(verdict.allowedFields).toEqual([]);
    expect(verdict.coversAll([])).toBe(true);
    expect(verdict.coversSome([])).toBe(false);
    expect(verdict.pick({ a: 1, b: 2 })).toEqual({});
  });

  test("coversAllは空配列に対してtrueを返す", () => {
    const verdict = createVerdict(["a", "b"]);
    expect(verdict.coversAll([])).toBe(true);
  });

  test("coversSomeは空配列に対してfalseを返す", () => {
    const verdict = createVerdict(["a", "b"]);
    expect(verdict.coversSome([])).toBe(false);
  });

  test("pickでallowedFieldsにないキーは除外される", () => {
    const verdict = createVerdict(["a"]);
    expect(verdict.pick({ a: 1, b: 2, c: 3 })).toEqual({ a: 1 });
  });

  test("pickで空オブジェクトを渡すと空オブジェクトが返る", () => {
    const verdict = createVerdict(["a", "b"]);
    expect(verdict.pick({})).toEqual({});
  });

  test("pickでundefinedの値を持つフィールドも正しく処理される", () => {
    const verdict = createVerdict(["a", "b"]);
    expect(verdict.pick({ a: undefined, b: 1 })).toEqual({ a: undefined, b: 1 });
  });

  test("pickでnullの値を持つフィールドも正しく処理される", () => {
    const verdict = createVerdict(["a", "b"]);
    expect(verdict.pick({ a: null, b: 1 })).toEqual({ a: null, b: 1 });
  });
});

describe("mergeFieldVerdicts - 追加エッジケース", () => {
  test("3つ以上のverdictをunionモードでマージできる", () => {
    const v1 = createVerdict<"a" | "b" | "c" | "d">(["a"]);
    const v2 = createVerdict<"a" | "b" | "c" | "d">(["b"]);
    const v3 = createVerdict<"a" | "b" | "c" | "d">(["c"]);

    const result = mergeFieldVerdicts("union", [v1, v2, v3], ["a", "b", "c", "d"]);
    expect(result.allowedFields).toEqual(["a", "b", "c"]);
  });

  test("同一verdictを複数回渡しても結果が変わらない", () => {
    const v = createVerdict<"a" | "b">(["a"]);

    const result = mergeFieldVerdicts("intersection", [v, v, v], ["a", "b"]);
    expect(result.allowedFields).toEqual(["a"]);
  });

  test("fieldsに含まれないフィールドがverdictにあっても無視される", () => {
    const v = createVerdict<"a" | "b" | "c">(["a", "b", "c"]);

    // fieldsとして"a"と"b"のみ指定
    const result = mergeFieldVerdicts("union", [v], ["a", "b"] as ("a" | "b" | "c")[]);
    expect(result.allowedFields).toEqual(["a", "b"]);
  });
});

describe("withDerive - 追加テスト", () => {
  type Context = { userId: string; role: "admin" | "user" };

  test("withDeriveでctxの値に基づく動的な判定ができる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "secret"],
      policy: {
        admin: true,
        user: { id: true, email: true },
      },
    })
      .withDerive(({ ctx, mergeVerdicts }) => ({
        verdict: mergeVerdicts("union", {
          admin: ctx.role === "admin",
          user: ctx.role === "user",
        }),
      }));

    const adminResult = guard.for({ userId: "1", role: "admin" });
    const userResult = guard.for({ userId: "2", role: "user" });

    expect(adminResult.verdict.allowedFields).toEqual(["id", "email", "secret"]);
    expect(userResult.verdict.allowedFields).toEqual(["id", "email"]);
  });
});
