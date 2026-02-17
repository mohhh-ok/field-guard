import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";

describe("defineGuard - エッジケース", () => {
  type Context = { userId: string; role: "admin" | "user" };

  test("フィールドが空の配列でも動作する", () => {
    const guard = defineGuard<"level", Context>()({
      fields: [],
      policy: { level: true },
    });

    const result = guard.for({ userId: "1", role: "user" });
    expect(result).toBeDefined();
  });

  test("同じインスタンスで異なるコンテキストを使用できる", () => {
    const guard = defineGuard<"level", Context>()({
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
    const guard = defineGuard<"level1" | "level2", Context>()({
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
    const guard = defineGuard<"level1" | "level2", Context>()({
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
});
