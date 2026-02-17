import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";

describe("defineGuard - forなしでの直接アクセス", () => {
  type Context = { userId: string; role: "admin" | "user" };

  test("fieldsに直接アクセスできる", () => {
    const guard = defineGuard<"level", Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { level: true },
    });

    expect(guard.fields).toEqual(["id", "email", "name", "password"]);
  });

  test("verdictMapに直接アクセスできる", () => {
    const guard = defineGuard<"public" | "private", Context>()({
      fields: ["id", "email", "name", "password"],
      policy: {
        public: { id: true, name: true },
        private: true,
      },
    });

    expect(guard.verdictMap.public.allowedFields).toEqual(["id", "name"]);
    expect(guard.verdictMap.private.allowedFields).toEqual(["id", "email", "name", "password"]);
  });

  test("verdictMapのcoversAll/coversSomeが使える", () => {
    const guard = defineGuard<"level", Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { level: { id: true, email: true } },
    });

    expect(guard.verdictMap.level.coversAll(["id", "email"])).toBe(true);
    expect(guard.verdictMap.level.coversAll(["id", "name"])).toBe(false);
    expect(guard.verdictMap.level.coversSome(["id", "name"])).toBe(true);
    expect(guard.verdictMap.level.coversSome(["name", "password"])).toBe(false);
  });

  test("mergeVerdictsに直接アクセスできる", () => {
    const guard = defineGuard<"level1" | "level2", Context>()({
      fields: ["id", "email", "name", "password"],
      policy: {
        level1: { id: true, email: true },
        level2: { email: true, name: true },
      },
    });

    const union = guard.mergeVerdicts("union", { level1: true, level2: true });
    const intersection = guard.mergeVerdicts("intersection", { level1: true, level2: true });

    expect(union.allowedFields).toEqual(["id", "email", "name"]);
    expect(intersection.allowedFields).toEqual(["email"]);
  });

  test("withDerive後もfields/verdictMap/mergeVerdictsにアクセスできる", () => {
    const guard = defineGuard<"public", Context>()({
      fields: ["id", "email", "name", "password"],
      policy: { public: { id: true } },
    }).withDerive(({ ctx }) => ({
      isAdmin: ctx.role === "admin",
    }));

    expect(guard.fields).toEqual(["id", "email", "name", "password"]);
    expect(guard.verdictMap.public.allowedFields).toEqual(["id"]);
    expect(guard.mergeVerdicts("union", { public: true }).allowedFields).toEqual(["id"]);
  });

  test("withCheck後もfields/verdictMap/mergeVerdictsにアクセスできる", () => {
    const guard = defineGuard<"owner" | "other", Context>()({
      fields: ["id", "email", "name", "password"],
      policy: {
        owner: true,
        other: { id: true, name: true },
      },
    }).withCheck<{ id: string; ownerId: string }>()((params) => {
      const isOwner = params.ctx.userId === params.target.ownerId;
      return isOwner ? params.verdictMap.owner : params.verdictMap.other;
    });

    expect(guard.fields).toEqual(["id", "email", "name", "password"]);
    expect(guard.verdictMap.owner.allowedFields).toEqual(["id", "email", "name", "password"]);
    expect(guard.verdictMap.other.allowedFields).toEqual(["id", "name"]);
    expect(guard.mergeVerdicts("union", { owner: true, other: true }).allowedFields).toEqual([
      "id",
      "email",
      "name",
      "password",
    ]);
  });
});
