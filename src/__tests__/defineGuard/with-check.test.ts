import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";

describe("defineGuard - withCheckメソッド", () => {
  type Context = { userId: string; role: "admin" | "user" };
  type Target = { id: string; ownerId: string };

  test("checkメソッドが追加される", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { public: true },
    })
      .withCheck<Target>()(({ verdictMap }) => {
        return verdictMap.public;
      });

    const result = guard.for({ userId: "1", role: "user" });
    expect(result.check).toBeDefined();
    expect(typeof result.check).toBe("function");
  });

  test("checkメソッドがtargetを受け取って処理できる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: {
        owner: true,
        other: { id: true, name: true },
      },
    })
      .withCheck<Target>()(({ ctx, target, verdictMap }) => {
        const isOwner = ctx.userId === target.ownerId;
        return isOwner ? verdictMap.owner : verdictMap.other;
      });

    const ctx: Context = { userId: "123", role: "user" };
    const result = guard.for(ctx);

    const ownTarget = { id: "1", ownerId: "123" };
    const otherTarget = { id: "2", ownerId: "456" };

    const ownerVerdict = result.check(ownTarget);
    const otherVerdict = result.check(otherTarget);

    expect(ownerVerdict.allowedFields).toEqual(["id", "email", "name", "password"]);
    expect(otherVerdict.allowedFields).toEqual(["id", "name"]);
  });

  test("withDeriveと組み合わせて使用できる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { public: { id: true } },
    })
      .withDerive(({ ctx }) => ({
        isAdmin: ctx.role === "admin",
      }))
      .withCheck<Target>()(({ verdictMap }) => {
        return verdictMap.public;
      });

    const result = guard.for({ userId: "1", role: "admin" });
    expect(result.isAdmin).toBe(true);
    expect(result.check).toBeDefined();

    const verdict = result.check({ id: "1", ownerId: "1" });
    expect(verdict.allowedFields).toEqual(["id"]);
  });

  test("複雑な判定ロジックを実装できる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: {
        admin: true,
        owner: { id: true, email: true, name: true },
        public: { id: true },
      },
    })
      .withCheck<Target>()(({ ctx, target, verdictMap }) => {
        if (ctx.role === "admin") {
          return verdictMap.admin;
        }
        const isOwner = ctx.userId === target.ownerId;
        return isOwner ? verdictMap.owner : verdictMap.public;
      });

    const adminResult = guard.for({ userId: "1", role: "admin" });
    const userResult = guard.for({ userId: "2", role: "user" });

    const target = { id: "t1", ownerId: "2" };

    const adminVerdict = adminResult.check(target);
    const ownerVerdict = userResult.check(target);
    const otherTarget = { id: "t2", ownerId: "999" };
    const otherVerdict = userResult.check(otherTarget);

    expect(adminVerdict.allowedFields).toEqual(["id", "email", "name", "password"]);
    expect(ownerVerdict.allowedFields).toEqual(["id", "email", "name"]);
    expect(otherVerdict.allowedFields).toEqual(["id"]);
  });
});
