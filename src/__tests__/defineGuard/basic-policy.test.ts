import { describe, expect, test } from "vitest";
import { defineGuard } from "../../defineGuard";

describe("defineGuard - 基本的なポリシー定義", () => {
  type Context = { userId: string; role: "admin" | "user" };
  type Fields = "id" | "email" | "name" | "password";

  describe("基本的なポリシー定義", () => {
    test("boolean型のポリシーでtrue指定時は全フィールドが許可される", () => {
      const guard = defineGuard<"public", Context>()({
        fields: ["id", "email", "name", "password"],
        policy: { public: true },
      });

      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });

    test("boolean型のポリシーでfalse指定時は全フィールドが拒否される", () => {
      const guard = defineGuard<"private", Context>()({
        fields: ["id", "email", "name", "password"],
        policy: { private: false },
      });

      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });

    test("複数のレベルを持つポリシーが定義できる", () => {
      const guard = defineGuard<"public" | "private", Context>()({
        fields: ["id", "email", "name", "password"],
        policy: {
          public: { id: true, name: true },
          private: true,
        },
      });

      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });
  });

  describe("ホワイトリストモード", () => {
    test("trueを指定したフィールドのみが許可される", () => {
      const guard = defineGuard<"level", Context>()({
        fields: ["id", "email", "name", "password"],
        policy: {
          level: { id: true, name: true },
        },
      });

      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });

    test("空のオブジェクトは全フィールドを拒否する", () => {
      const guard = defineGuard<"level", Context>()({
        fields: ["id", "email", "name", "password"],
        policy: {
          level: {},
        },
      });

      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });
  });

  describe("ブラックリストモード", () => {
    test("falseを指定したフィールドのみが拒否される", () => {
      const guard = defineGuard<"level", Context>()({
        fields: ["id", "email", "name", "password"],
        policy: {
          level: { password: false },
        },
      });

      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });

    test("複数のフィールドを拒否できる", () => {
      const guard = defineGuard<"level", Context>()({
        fields: ["id", "email", "name", "password"],
        policy: {
          level: { password: false, email: false },
        },
      });

      const result = guard.for({ userId: "1", role: "user" });
      expect(result).toBeDefined();
    });
  });
});
