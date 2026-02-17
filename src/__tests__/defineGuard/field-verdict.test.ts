import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";

describe("defineGuard - FieldVerdictの機能", () => {
  type Context = { userId: string; role: "admin" | "user" };

  test("coversAllメソッドで全フィールドの許可を確認できる", () => {
    const guard = defineGuard<Context>()({
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
    const guard = defineGuard<Context>()({
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

  test("pickメソッドでオブジェクトから許可フィールドだけを抽出できる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { level: { id: true, email: true } },
    })
      .withDerive(({ verdictMap }) => ({
        verdict: verdictMap.level,
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.verdict.pick({ id: 1, email: "a@b.com", name: "John", password: "secret" }))
      .toEqual({ id: 1, email: "a@b.com" });
  });

  test("pickメソッドで許可フィールドが存在しない場合は空オブジェクトを返す", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { level: { id: true } },
    })
      .withDerive(({ verdictMap }) => ({
        verdict: verdictMap.level,
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.verdict.pick({ name: "John", password: "secret" }))
      .toEqual({});
  });
});
