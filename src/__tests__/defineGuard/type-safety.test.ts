import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";

describe("defineGuard - 型安全性の確認", () => {
  type Context = { userId: string; role: "admin" | "user" };

  test("指定したフィールド型が保持される", () => {
    type CustomFields = "field1" | "field2" | "field3";
    const guard = defineGuard<Context>()({
      fields: ["field1", "field2", "field3"] satisfies readonly CustomFields[],
      policy: { level: { field1: true } },
    })
      .withDerive(({ fields }) => ({
        fields,
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.fields).toEqual(["field1", "field2", "field3"]);
  });

  test("複数のレベル型が保持される", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "data"],
      policy: {
        read: { id: true, data: true },
        write: { data: true },
        delete: false,
      },
    })
      .withDerive(({ verdictMap }) => ({
        readVerdict: verdictMap.read,
        writeVerdict: verdictMap.write,
        deleteVerdict: verdictMap.delete,
      }));

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.readVerdict.allowedFields).toEqual(["id", "data"]);
    expect(result.writeVerdict.allowedFields).toEqual(["data"]);
    expect(result.deleteVerdict.allowedFields).toEqual([]);
  });

  test("withDeriveの戻り値の型が保持される", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "name"],
      policy: { level: true },
    })
      .withDerive(({ ctx }) => ({
        isAdmin: ctx.role === "admin",
        userId: ctx.userId,
      }));

    const result = guard.for({ userId: "1", role: "admin" });
    // ランタイムで型の整合性を確認
    expect(typeof result.isAdmin).toBe("boolean");
    expect(typeof result.userId).toBe("string");
  });

  test("withCheckの戻り値の型が保持される", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "name"],
      policy: { level: true },
    })
      .withCheck<{ ownerId: string }>()(({ ctx, target, verdictMap }) => ({
        verdict: verdictMap.level,
        isOwner: ctx.userId === target.ownerId,
      }));

    const result = guard.for({ userId: "1", role: "user" });
    const checked = result.check({ ownerId: "1" });
    expect(typeof checked.isOwner).toBe("boolean");
    expect(checked.verdict.allowedFields).toEqual(["id", "name"]);
  });

  test("withDeriveは一度しか呼べない（型レベル）", () => {
    const guard = defineGuard<Context>()({
      fields: ["id"],
      policy: { level: true },
    }).withDerive(({ ctx }) => ({ isAdmin: ctx.role === "admin" }));

    // withDeriveを呼んだ後はwithDeriveプロパティが存在しない
    // @ts-expect-error - withDerive は1回のみ呼べる
    guard.withDerive;
  });

  test("withCheckは一度しか呼べない（型レベル）", () => {
    const guard = defineGuard<Context>()({
      fields: ["id"],
      policy: { level: true },
    }).withCheck<{ id: string }>()(({ verdictMap }) => verdictMap.level);

    // withCheckを呼んだ後はwithCheckプロパティが存在しない
    // @ts-expect-error - withCheck は1回のみ呼べる
    guard.withCheck;
  });

  test("withDerive後もwithCheckが呼べる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "name"],
      policy: { admin: true, user: { id: true } },
    })
      .withDerive(({ ctx }) => ({ isAdmin: ctx.role === "admin" }))
      .withCheck<{ ownerId: string }>()(({ target, ctx }) => ({
        isOwner: target.ownerId === ctx.userId,
      }));

    const result = guard.for({ userId: "1", role: "admin" });
    expect(result.isAdmin).toBe(true);
    expect(result.check({ ownerId: "1" }).isOwner).toBe(true);
  });
});
