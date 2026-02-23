---
name: field-guard
description: >
  Use this skill when working with the field-guard library
  (TypeScript field-level access control). Provides patterns for
  defineGuard, withCheck, withDerive, combineGuards, and mergeFieldVerdicts.
---

# field-guard skill

field-guard is a lightweight, fully type-safe, field-level access control library for TypeScript with zero runtime dependencies.

## Import

```ts
import { defineGuard, combineGuards, mergeFieldVerdicts } from "field-guard";
```

## Define a Guard

```ts
type Ctx = { userId: string; role: "admin" | "user" };
type User = { id: string; email: string; name: string };

const userGuard = defineGuard<Ctx>()({
  fields: ["id", "email", "name"],
  policy: {
    owner: true,                     // all fields allowed
    admin: true,                     // all fields allowed
    other: { id: true, name: true }, // whitelist — only id and name
    banned: false,                   // no fields allowed
  },
});
```

### Policy Modes

| Value | Behavior |
|---|---|
| `true` | Allow all fields for this level |
| `false` | Deny all fields for this level |
| `{ id: true, name: true }` | Whitelist — only listed fields allowed |
| `{ secret: false }` | Blacklist — all fields except listed ones |

`fields` and `policy` are both optional. You can omit either or both.

## `.withCheck<Target>()`

Resolves the access level based on context and a target object. Use `verdictMap[level]` to return the correct `FieldVerdict`.

```ts
const userGuard = defineGuard<Ctx>()({
  fields: ["id", "email", "name"],
  policy: {
    owner: true,
    other: { id: true, name: true },
  },
}).withCheck<User>()(({ ctx, target, verdictMap }) => {
  const level = ctx.userId === target.id ? "owner" : "other";
  return verdictMap[level];
});

// Evaluate
const g = userGuard.for({ userId: "1", role: "user" });
const verdict = g.check({ id: "1", email: "me@example.com", name: "Me" });
verdict.allowedFields; // ["id", "email", "name"]
```

## `.withDerive()`

Computes extra properties from context. Can also produce row-level filter conditions.

```ts
import { eq } from "drizzle-orm";

type Post = { id: string; content: string; authorId: string };

const postGuard = defineGuard<Ctx>()({
  fields: ["id", "content", "authorId"],
  policy: {
    owner: true,
    other: { id: true, content: true },
  },
})
  .withDerive(({ ctx }) => ({
    // Row-level filter (e.g. for Drizzle ORM WHERE clause)
    where: ctx.role === "admin"
      ? undefined
      : eq(posts.authorId, ctx.userId),
  }))
  .withCheck<Post>()(({ ctx, target, verdictMap }) => {
    const level = ctx.userId === target.authorId ? "owner" : "other";
    return verdictMap[level];
  });

// Usage
const g = postGuard.for({ userId: "1", role: "user" });
const rows = await db.select().from(posts).where(g.where); // row-level
const results = rows.map((row) => g.check(row).pick(row)); // field-level
```

## `combineGuards`

Bundles multiple guards for different resources and binds them all at once with a single `.for()` call.

```ts
const guards = combineGuards<Ctx>()({
  users: userGuard,
  posts: postGuard,
});

const g = guards.for({ userId: "1", role: "user" });

g.users.check({ id: "1", email: "a@b.com", name: "A" });
g.posts.check({ id: "p1", content: "hello", authorId: "1" });
```

## `FieldVerdict` Helpers

```ts
verdict.allowedFields;              // string[] of allowed field names
verdict.coversAll(["id", "name"]);  // true if all given fields are allowed
verdict.coversSome(["email"]);      // true if any given field is allowed
verdict.pick(obj);                  // returns object with only allowed fields
```

## `mergeFieldVerdicts`

Merges multiple verdicts with `"union"` (any-of) or `"intersection"` (all-of) strategy.

```ts
// Union: field allowed if ANY verdict allows it
mergeFieldVerdicts("union", [verdictA, verdictB], fields);

// Intersection: field allowed only if ALL verdicts allow it
mergeFieldVerdicts("intersection", [verdictA, verdictB], fields);
```

Also available as `mergeVerdicts` on every guard instance:

```ts
const verdict = guard.mergeVerdicts("union", { owner: true, admin: false });
```

## Type Safety

All fields, levels, and verdicts are inferred from your definitions. The TypeScript compiler immediately flags:

- Unknown field names in `policy`
- Unknown levels in `verdictMap` lookups
- Incorrect return types from `.withCheck()`

Type errors from AI-generated code become instant feedback — no runtime surprises.
