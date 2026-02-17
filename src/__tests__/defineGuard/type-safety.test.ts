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
});
