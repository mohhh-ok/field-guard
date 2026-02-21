import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";

describe("defineGuard - fieldsとpolicyのオプショナル化", () => {
  type Context = { userId: string; role: "admin" | "user" };

  describe("引数なし", () => {
    test("引数なしでガードを定義できる", () => {
      const guard = defineGuard<Context>()();
      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });

    test("引数なしでfieldsは空配列になる", () => {
      const guard = defineGuard<Context>()();
      expect(guard.fields).toEqual([]);
    });

    test("引数なしでverdictMapは空オブジェクトになる", () => {
      const guard = defineGuard<Context>()();
      expect(guard.verdictMap).toEqual({});
    });

    test("引数なしでwithDeriveが使える", () => {
      const guard = defineGuard<Context>()()
        .withDerive(({ ctx }) => ({
          isAdmin: ctx.role === "admin",
        }));

      const result = guard.for({ userId: "1", role: "admin" });
      expect(result.isAdmin).toBe(true);
    });

    test("引数なしでwithCheckが使える", () => {
      const guard = defineGuard<Context>()()
        .withCheck<{ ownerId: string }>()(({ ctx, target }) => ({
          isOwner: ctx.userId === target.ownerId,
        }));

      const result = guard.for({ userId: "1", role: "user" });
      expect(result.check({ ownerId: "1" })).toEqual({ isOwner: true });
      expect(result.check({ ownerId: "2" })).toEqual({ isOwner: false });
    });

    test("引数なしでwithDeriveとwithCheckを組み合わせられる", () => {
      const guard = defineGuard<Context>()()
        .withDerive(({ ctx }) => ({
          isAdmin: ctx.role === "admin",
        }))
        .withCheck<{ ownerId: string }>()(({ ctx, target }) => ({
          isOwner: ctx.userId === target.ownerId,
        }));

      const result = guard.for({ userId: "1", role: "admin" });
      expect(result.isAdmin).toBe(true);
      expect(result.check({ ownerId: "1" })).toEqual({ isOwner: true });
    });
  });

  describe("空オブジェクト", () => {
    test("空オブジェクトでガードを定義できる", () => {
      const guard = defineGuard<Context>()({});
      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });

    test("空オブジェクトでfieldsは空配列になる", () => {
      const guard = defineGuard<Context>()({});
      expect(guard.fields).toEqual([]);
    });

    test("空オブジェクトでverdictMapは空オブジェクトになる", () => {
      const guard = defineGuard<Context>()({});
      expect(guard.verdictMap).toEqual({});
    });
  });

  describe("fieldsのみ指定", () => {
    test("fieldsのみでガードを定義できる", () => {
      const guard = defineGuard<Context>()({
        fields: ["id", "email", "name"],
      });
      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });

    test("fieldsのみ指定時にfieldsが保持される", () => {
      const guard = defineGuard<Context>()({
        fields: ["id", "email", "name"],
      });
      expect(guard.fields).toEqual(["id", "email", "name"]);
    });

    test("fieldsのみ指定時にverdictMapは空オブジェクトになる", () => {
      const guard = defineGuard<Context>()({
        fields: ["id", "email", "name"],
      });
      expect(guard.verdictMap).toEqual({});
    });

    test("fieldsのみ指定時にwithDeriveでfieldsにアクセスできる", () => {
      const guard = defineGuard<Context>()({
        fields: ["id", "email", "name"],
      }).withDerive(({ fields }) => ({
        allFields: fields,
      }));

      const result = guard.for({ userId: "1", role: "user" });
      expect(result.allFields).toEqual(["id", "email", "name"]);
    });

    test("fieldsのみ指定時にmergeVerdictsで空のflagsを渡すと空の結果が返る", () => {
      const guard = defineGuard<Context>()({
        fields: ["id", "email", "name"],
      }).withDerive(({ mergeVerdicts }) => ({
        empty: mergeVerdicts("union", {}),
      }));

      const result = guard.for({ userId: "1", role: "user" });
      expect(result.empty.allowedFields).toEqual([]);
    });
  });

  describe("policyのみ指定", () => {
    test("policyのみでガードを定義できる", () => {
      const guard = defineGuard<Context>()({
        policy: { admin: true, user: false },
      });
      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });

    test("policyのみ指定時にfieldsは空配列になる", () => {
      const guard = defineGuard<Context>()({
        policy: { admin: true, user: false },
      });
      expect(guard.fields).toEqual([]);
    });

    test("policyのみ指定時にverdictMapのallowedFieldsは空になる", () => {
      const guard = defineGuard<Context>()({
        policy: { admin: true, user: false },
      });
      expect(guard.verdictMap.admin.allowedFields).toEqual([]);
      expect(guard.verdictMap.user.allowedFields).toEqual([]);
    });
  });

  describe("combineGuardsとの互換性", () => {
    test("オプショナルなガードもcombineGuardsで結合できる", async () => {
      const { combineGuards } = await import("../../combineGuards");

      const simpleGuard = defineGuard<Context>()()
        .withDerive(({ ctx }) => ({
          isAdmin: ctx.role === "admin",
        }));

      const fieldGuard = defineGuard<Context>()({
        fields: ["id", "email"],
        policy: { public: { id: true } },
      }).withDerive(({ verdictMap }) => ({
        publicFields: verdictMap.public.allowedFields,
      }));

      const guards = combineGuards<Context>()({
        simple: simpleGuard,
        withFields: fieldGuard,
      });

      const g = guards.for({ userId: "1", role: "admin" });
      expect(g.simple.isAdmin).toBe(true);
      expect(g.withFields.publicFields).toEqual(["id"]);
    });
  });
});
