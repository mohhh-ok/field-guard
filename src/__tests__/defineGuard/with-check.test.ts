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

  test("withCheck内でderivedにアクセスできる", () => {
    const guard = defineGuard<Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { public: { id: true } },
    })
      .withDerive(({ ctx }) => ({
        isAdmin: ctx.role === "admin",
      }))
      .withCheck<Target>()(({ verdictMap, derived }) => {
        return { verdict: verdictMap.public, isAdmin: derived.isAdmin };
      });

    const result = guard.for({ userId: "1", role: "admin" });
    const checked = result.check({ id: "1", ownerId: "1" });
    expect(checked.verdict.allowedFields).toEqual(["id"]);
    expect(checked.isAdmin).toBe(true);
  });

  test("ネストしたガードをderivedで合成できる", () => {
    type User = { id: string; email: string; name: string };
    type Post = { id: string; content: string; author: User };

    const userGuard = defineGuard<Context>()({
      fields: ["id", "email", "name"],
      policy: {
        owner: true,
        other: { id: true, name: true },
      },
    }).withCheck<User>()(({ ctx, target, verdictMap }) => {
      return verdictMap[ctx.userId === target.id ? "owner" : "other"];
    });

    const postGuard = defineGuard<Context>()({
      fields: ["id", "content", "author"],
      policy: {
        owner: true,
        other: { id: true, content: true, author: true },
      },
    })
      .withDerive(({ ctx }) => ({
        userChecker: userGuard.for(ctx),
      }))
      .withCheck<Post>()(({ ctx, target, verdictMap, derived }) => {
        const postVerdict = verdictMap[ctx.userId === target.author.id ? "owner" : "other"];
        const authorVerdict = derived.userChecker.check(target.author);
        return { post: postVerdict, author: authorVerdict };
      });

    // ownerのケース
    const g1 = postGuard.for({ userId: "1", role: "user" });
    const post1: Post = { id: "p1", content: "hello", author: { id: "1", email: "me@example.com", name: "Me" } };
    const result1 = g1.check(post1);

    expect(result1.post.allowedFields).toEqual(["id", "content", "author"]);
    expect(result1.author.allowedFields).toEqual(["id", "email", "name"]);

    const picked1 = {
      ...result1.post.pick(post1),
      author: result1.author.pick(post1.author),
    };
    expect(picked1).toEqual({ id: "p1", content: "hello", author: { id: "1", email: "me@example.com", name: "Me" } });

    // otherのケース
    const post2: Post = { id: "p2", content: "world", author: { id: "99", email: "other@example.com", name: "Other" } };
    const result2 = g1.check(post2);

    expect(result2.post.allowedFields).toEqual(["id", "content", "author"]);
    expect(result2.author.allowedFields).toEqual(["id", "name"]);

    const picked2 = {
      ...result2.post.pick(post2),
      author: result2.author.pick(post2.author),
    };
    expect(picked2).toEqual({ id: "p2", content: "world", author: { id: "99", name: "Other" } });
  });
});
