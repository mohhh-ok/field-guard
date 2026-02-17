import { describe, expect, test } from "vitest";
import { combineGuards } from "../combineGuards";
import { defineGuard } from "../defineGuard";

describe("combineGuards", () => {
  type Ctx = { userId: string; role: "admin" | "user" };
  type User = { id: string; email: string; name: string };
  type Post = { id: string; content: string; authorId: string };

  const createUserGuard = () =>
    defineGuard<"owner" | "other", Ctx>()({
      fields: ["id", "email", "name"],
      policy: {
        owner: true,
        other: { id: true, name: true },
      },
    }).withCheck<User>()(({ ctx, target, verdictMap }) => {
      const level = ctx.userId === target.id ? "owner" : "other";
      return verdictMap[level];
    });

  const createPostGuard = () =>
    defineGuard<"author" | "public", Ctx>()({
      fields: ["id", "content"],
      policy: {
        author: true,
        public: { id: true },
      },
    }).withCheck<Post>()(({ ctx, target, verdictMap }) => {
      const level = ctx.userId === target.authorId ? "author" : "public";
      return verdictMap[level];
    });

  describe("基本的な結合", () => {
    test("複数のガードを結合してforで一括バインドできる", () => {
      const guards = combineGuards<Ctx>()({
        users: createUserGuard(),
        posts: createPostGuard(),
      });

      const ctx: Ctx = { userId: "1", role: "user" };
      const g = guards.for(ctx);

      expect(g.users).toBeDefined();
      expect(g.posts).toBeDefined();
      expect(typeof g.users.check).toBe("function");
      expect(typeof g.posts.check).toBe("function");
    });

    test("各ガードのcheckが正しく動作する", () => {
      const guards = combineGuards<Ctx>()({
        users: createUserGuard(),
        posts: createPostGuard(),
      });

      const ctx: Ctx = { userId: "1", role: "user" };
      const g = guards.for(ctx);

      const ownUser = g.users.check({ id: "1", email: "me@example.com", name: "Me" });
      expect(ownUser.allowedFields).toEqual(["id", "email", "name"]);

      const otherUser = g.users.check({ id: "2", email: "other@example.com", name: "Other" });
      expect(otherUser.allowedFields).toEqual(["id", "name"]);

      const ownPost = g.posts.check({ id: "p1", content: "hello", authorId: "1" });
      expect(ownPost.allowedFields).toEqual(["id", "content"]);

      const otherPost = g.posts.check({ id: "p2", content: "world", authorId: "999" });
      expect(otherPost.allowedFields).toEqual(["id"]);
    });
  });

  describe("異なるコンテキストでの動作", () => {
    test("異なるコンテキストで異なる結果を返す", () => {
      const guards = combineGuards<Ctx>()({
        users: createUserGuard(),
        posts: createPostGuard(),
      });

      const user1 = guards.for({ userId: "1", role: "user" });
      const user2 = guards.for({ userId: "2", role: "user" });

      const target: User = { id: "1", email: "me@example.com", name: "Me" };

      const fromUser1 = user1.users.check(target);
      const fromUser2 = user2.users.check(target);

      expect(fromUser1.allowedFields).toEqual(["id", "email", "name"]);
      expect(fromUser2.allowedFields).toEqual(["id", "name"]);
    });
  });

  describe("withDeriveとの組み合わせ", () => {
    test("withDeriveで追加されたプロパティにアクセスできる", () => {
      const guardWithDerive = defineGuard<"public", Ctx>()({
        fields: ["id", "email"],
        policy: { public: true },
      }).withDerive(({ ctx }) => ({
        isAdmin: ctx.role === "admin",
      }));

      const guards = combineGuards<Ctx>()({
        users: guardWithDerive,
      });

      const adminG = guards.for({ userId: "1", role: "admin" });
      const userG = guards.for({ userId: "2", role: "user" });

      expect(adminG.users.isAdmin).toBe(true);
      expect(userG.users.isAdmin).toBe(false);
    });

    test("withDeriveとwithCheckの両方がある場合に両方アクセスできる", () => {
      const guard = defineGuard<"owner" | "other", Ctx>()({
        fields: ["id", "email"],
        policy: {
          owner: true,
          other: { id: true },
        },
      })
        .withDerive(({ ctx }) => ({
          isAdmin: ctx.role === "admin",
        }))
        .withCheck<User>()(({ ctx, target, verdictMap }) => {
          const level = ctx.userId === target.id ? "owner" : "other";
          return verdictMap[level];
        });

      const guards = combineGuards<Ctx>()({
        users: guard,
      });

      const g = guards.for({ userId: "1", role: "admin" });
      expect(g.users.isAdmin).toBe(true);
      expect(g.users.check({ id: "1", email: "a@b.com", name: "A" }).allowedFields).toEqual(["id", "email"]);
    });
  });

  describe("単一ガードの結合", () => {
    test("ガードが1つだけでも動作する", () => {
      const guards = combineGuards<Ctx>()({
        posts: createPostGuard(),
      });

      const g = guards.for({ userId: "1", role: "user" });
      const verdict = g.posts.check({ id: "p1", content: "hello", authorId: "1" });
      expect(verdict.allowedFields).toEqual(["id", "content"]);
    });
  });

  describe("resolveなしのガード", () => {
    test("withCheckなしのガードも結合できる", () => {
      const simpleGuard = defineGuard<"public", Ctx>()({
        fields: ["id", "name"],
        policy: { public: true },
      }).withDerive(({ verdictMap }) => ({
        publicFields: verdictMap.public.allowedFields,
      }));

      const guards = combineGuards<Ctx>()({
        items: simpleGuard,
      });

      const g = guards.for({ userId: "1", role: "user" });
      expect(g.items.publicFields).toEqual(["id", "name"]);
    });
  });

  describe("多数のガードの結合", () => {
    test("3つ以上のガードを結合できる", () => {
      const tagGuard = defineGuard<"visible", Ctx>()({
        fields: ["id", "label"],
        policy: { visible: true },
      }).withCheck<{ id: string; label: string }>()(({ verdictMap }) => {
        return verdictMap.visible;
      });

      const guards = combineGuards<Ctx>()({
        users: createUserGuard(),
        posts: createPostGuard(),
        tags: tagGuard,
      });

      const g = guards.for({ userId: "1", role: "user" });

      expect(typeof g.users.check).toBe("function");
      expect(typeof g.posts.check).toBe("function");
      expect(typeof g.tags.check).toBe("function");

      const tagVerdict = g.tags.check({ id: "t1", label: "test" });
      expect(tagVerdict.allowedFields).toEqual(["id", "label"]);
    });
  });
});
