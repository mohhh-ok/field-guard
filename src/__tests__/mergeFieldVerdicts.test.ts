import { describe, expect, it } from "vitest";
import { mergeFieldVerdicts } from "../mergeFieldVerdicts";
import { createVerdict } from "../types";

describe("mergeFieldVerdicts", () => {
  const fields = ["field1", "field2", "field3", "field4"] as const;
  type TestField = (typeof fields)[number];

  describe("union mode", () => {
    it("空の配列が渡された場合、全フィールドが拒否される", () => {
      const result = mergeFieldVerdicts<TestField>("union", [], [...fields]);

      expect(result.allowedFields).toEqual([]);
    });

    it("単一のverdictが渡された場合、そのverdictがそのまま返される", () => {
      const verdict = createVerdict<TestField>(["field1", "field2"]);

      const result = mergeFieldVerdicts("union", [verdict], [...fields]);

      expect(result.allowedFields).toEqual(["field1", "field2"]);
    });

    it("複数のverdictがある場合、いずれかで許可されているフィールドが許可される", () => {
      const verdict1 = createVerdict<TestField>(["field1", "field2"]);
      const verdict2 = createVerdict<TestField>(["field2", "field3"]);

      const result = mergeFieldVerdicts("union", [verdict1, verdict2], [...fields]);

      expect(result.allowedFields).toEqual(["field1", "field2", "field3"]);
    });

    it("全てのverdictで拒否されているフィールドのみが拒否される", () => {
      const verdict1 = createVerdict<TestField>(["field1"]);
      const verdict2 = createVerdict<TestField>(["field2"]);
      const verdict3 = createVerdict<TestField>(["field3"]);

      const result = mergeFieldVerdicts("union", [verdict1, verdict2, verdict3], [...fields]);

      expect(result.allowedFields).toEqual(["field1", "field2", "field3"]);
    });

    it("全てのverdictで全フィールドが許可されている場合、全て許可される", () => {
      const verdict1 = createVerdict<TestField>([...fields]);
      const verdict2 = createVerdict<TestField>([...fields]);

      const result = mergeFieldVerdicts("union", [verdict1, verdict2], [...fields]);

      expect(result.allowedFields).toEqual([...fields]);
    });
  });

  describe("intersection mode", () => {
    it("空の配列が渡された場合、全フィールドが拒否される", () => {
      const result = mergeFieldVerdicts<TestField>("intersection", [], [...fields]);

      expect(result.allowedFields).toEqual([]);
    });

    it("単一のverdictが渡された場合、そのverdictがそのまま返される", () => {
      const verdict = createVerdict<TestField>(["field1", "field2"]);

      const result = mergeFieldVerdicts("intersection", [verdict], [...fields]);

      expect(result.allowedFields).toEqual(["field1", "field2"]);
    });

    it("複数のverdictがある場合、全てで許可されているフィールドのみが許可される", () => {
      const verdict1 = createVerdict<TestField>(["field1", "field2", "field3"]);
      const verdict2 = createVerdict<TestField>(["field2", "field3"]);

      const result = mergeFieldVerdicts("intersection", [verdict1, verdict2], [...fields]);

      expect(result.allowedFields).toEqual(["field2", "field3"]);
    });

    it("いずれかのverdictで拒否されているフィールドは拒否される", () => {
      const verdict1 = createVerdict<TestField>(["field1", "field2", "field3"]);
      const verdict2 = createVerdict<TestField>(["field1", "field2"]);
      const verdict3 = createVerdict<TestField>(["field1"]);

      const result = mergeFieldVerdicts("intersection", [verdict1, verdict2, verdict3], [...fields]);

      expect(result.allowedFields).toEqual(["field1"]);
    });

    it("共通して許可されているフィールドがない場合、全て拒否される", () => {
      const verdict1 = createVerdict<TestField>(["field1", "field2"]);
      const verdict2 = createVerdict<TestField>(["field3", "field4"]);

      const result = mergeFieldVerdicts("intersection", [verdict1, verdict2], [...fields]);

      expect(result.allowedFields).toEqual([]);
    });

    it("全てのverdictで全フィールドが許可されている場合、全て許可される", () => {
      const verdict1 = createVerdict<TestField>([...fields]);
      const verdict2 = createVerdict<TestField>([...fields]);

      const result = mergeFieldVerdicts("intersection", [verdict1, verdict2], [...fields]);

      expect(result.allowedFields).toEqual([...fields]);
    });
  });
});
