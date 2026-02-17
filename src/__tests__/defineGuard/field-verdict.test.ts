import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";

describe("defineGuard - FieldVerdictの機能", () => {
  type Context = { userId: string; role: "admin" | "user" };

  test("coversAllメソッドで全フィールドの許可を確認できる", () => {
    const guard = defineGuard<"level", Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { level: { id: true, email: true } },
    })
      .withDerive(({ verdictMap }) => ({
        verdict: verdictMap.level,
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.verdict.coversAll(["id", "email"])).toBe(true);
    expect(result.verdict.coversAll(["id", "name"])).toBe(false);
    expect(result.verdict.coversAll(["name"])).toBe(false);
  });

  test("coversSomeメソッドで一部フィールドの許可を確認できる", () => {
    const guard = defineGuard<"level", Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { level: { id: true, email: true } },
    })
      .withDerive(({ verdictMap }) => ({
        verdict: verdictMap.level,
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.verdict.coversSome(["id", "name"])).toBe(true);
    expect(result.verdict.coversSome(["name", "password"])).toBe(false);
    expect(result.verdict.coversSome(["id"])).toBe(true);
  });
});
