import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";

describe("defineGuard - withDeriveメソッド", () => {
  type Context = { userId: string; role: "admin" | "user" };

  test("派生データを追加できる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { public: true },
    })
      .withDerive(({ ctx }) => ({
        isAdmin: ctx.role === "admin",
      }));

    const result = guard.for({ userId: "1", role: "admin" });
    expect(result.isAdmin).toBe(true);
  });

  test("複数の派生データを追加できる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { public: true },
    })
      .withDerive(({ ctx }) => ({
        isAdmin: ctx.role === "admin",
        userId: ctx.userId,
      }));

    const result = guard.for({ userId: "123", role: "user" });
    expect(result.isAdmin).toBe(false);
    expect(result.userId).toBe("123");
  });

  test("verdictMapとfieldsにアクセスできる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { public: { id: true } },
    })
      .withDerive(({ verdictMap, fields }) => ({
        publicVerdict: verdictMap.public,
        allFields: fields,
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.publicVerdict).toBeDefined();
    expect(result.publicVerdict.allowedFields).toEqual(["id"]);
    expect(result.allFields).toEqual(["id", "email", "name", "password"]);
  });

  test("mergeVerdictsを使用してマージできる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: {
        level1: { id: true, email: true },
        level2: { email: true, name: true },
      },
    })
      .withDerive(({ mergeVerdicts }) => ({
        union: mergeVerdicts("union", { level1: true, level2: true }),
        intersection: mergeVerdicts("intersection", { level1: true, level2: true }),
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.union.allowedFields).toEqual(["id", "email", "name"]);
    expect(result.intersection.allowedFields).toEqual(["email"]);
  });
});
