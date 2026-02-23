# field-guard

A lightweight, fully type-safe, field-level access control library for TypeScript.

Define **who** can see **which fields** of your data — with zero runtime dependencies.

## Why field-guard?

[CASL](https://casl.js.org/) is a great general-purpose authorization library — but if all you need is **field-level visibility control** in a TypeScript + ORM codebase, it can feel like more than you bargained for:

- **Runtime subject tagging.** CASL requires `subject('Post', post)` to identify types at runtime. ORM results (e.g. from Drizzle) don't carry a `__typename`-like field, so you end up wrapping every query result manually.
- **Type inference gaps.** The `SubjectType` system can lose type information, reducing TypeScript's value.
- **Broad API surface.** CASL covers far more than field visibility — which is powerful, but also means more concepts to learn for a narrow use case.

**field-guard** is purpose-built for that narrow use case:

- **ORM results go in directly** — no `subject()` wrapping, no `__typename` injection
- **Missing fields cause compiler errors** — the check function's target type enforces what's needed
- **Minimal API** — `defineGuard`, `combineGuards`, and you're done

## Features

- 🔒 **Field-level access control** — Grant or deny access per field, per access level
- 🏗️ **Builder pattern API** — Chainable `.withDerive()` and `.withCheck()` for composable guards
- 🔀 **Merge strategies** — Combine multiple verdicts via `union` or `intersection`
- 🧩 **Composable** — Combine multiple guards into a single object with `combineGuards`
- 🦺 **Fully type-safe** — All fields, levels, and results are inferred from your definitions

## Works well with AI coding tools

field-guard's design aligns naturally with AI-driven development workflows:

**Type-safe output validation** — Context, fields, and levels are all preserved as TypeScript types. The compiler immediately flags any mistakes in AI-generated code, turning type errors into a fast feedback loop.

**Zero-risk extensibility** — Adding a new resource never touches existing guards:

```ts
combineGuards<Ctx>()({
  users: userGuard,   // unchanged
  posts: postGuard,   // add new resources without risk of regression
});
```

**Consistent, predictable patterns** — Every guard follows the same shape. Once an AI sees one `.withCheck()` implementation, it can replicate the pattern accurately for any new resource:

```ts
.withCheck<Post>()(({ ctx, target, verdictMap }) => {
  return verdictMap[ctx.userId === target.authorId ? "author" : "other"];
})
```

### Agent Skill

Install the field-guard skill directly into your coding agent:

```
npx skills add mohhh-ok/field-guard
```

Supports Claude Code, Cursor, and other agents detected by the [`skills`](https://www.npmjs.com/package/skills) CLI.

## Installation

```
npm install field-guard
```

```
import { defineGuard, combineGuards, mergeFieldVerdicts } from "field-guard";
```

## Core Concepts

| Concept       | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| **Field**     | A string literal representing a property name (e.g. `"id"`, `"email"`)     |
| **Level**     | An access level label (e.g. `"owner"`, `"public"`, `"admin"`)              |
| **Policy**    | A mapping from levels to field permissions (`true`, `false`, or per-field)  |
| **Verdict**   | The resolved result: a list of allowed fields with helper methods           |
| **Context**   | Arbitrary user/session data passed into guards at evaluation time           |

## Usage

### 1. Define a Guard

```ts
import { defineGuard } from "field-guard";

type Ctx = { userId: string; role: "admin" | "user" };
type User = { id: string; email: string; name: string };

const userGuard = defineGuard<Ctx>()({
  fields: ["id", "email", "name"],
  policy: {
    owner: true,                    // all fields allowed
    other: { id: true, name: true }, // whitelist mode — only id and name
  },
});
```

> `fields` and `policy` are both **optional**. You can omit either or both depending on your use case. See [Flexible Guard Definitions](#flexible-guard-definitions) below.

#### Policy Modes

- **`true`** — Allow all fields for this level
- **`false`** — Deny all fields for this level
- **Whitelist** `{ id: true, name: true }` — Only explicitly listed fields are allowed
- **Blacklist** `{ secretField: false }` — All fields allowed *except* those set to `false`

> The mode is auto-detected: if any value is `true`, it's whitelist mode; if all values are `false`, it's blacklist mode.

### 2. Add a Target Check

Use `.withCheck<T>()` to resolve the access level based on the context and a target object:

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
```

### 3. Evaluate the Guard

```ts
const guard = userGuard.for({ userId: "1", role: "user" });

const verdict = guard.check({ id: "1", email: "me@example.com", name: "Me" });
verdict.allowedFields; // ["id", "email", "name"]

const verdict2 = guard.check({ id: "2", email: "other@example.com", name: "Other" });
verdict2.allowedFields; // ["id", "name"]
```

### 4. Use Verdict Helpers

Each `FieldVerdict` comes with convenience methods:

```ts
verdict.coversAll(["id", "name"]);  // true — all requested fields are allowed
verdict.coversSome(["email"]);      // true — at least one requested field is allowed

// Pick only allowed fields from an object
verdict.pick({ id: "1", email: "me@example.com", name: "Me" });
// => { id: "1", email: "me@example.com", name: "Me" }  (owner)
// => { id: "1", name: "Me" }                            (other)
```

### 5. Flexible Guard Definitions

`fields` and `policy` are both optional. This lets you use `defineGuard` purely for context-based logic (via `.withDerive` / `.withCheck`) without declaring any field-level policy.

```ts
// No arguments — derive-only guard
const roleGuard = defineGuard<Ctx>()()
  .withDerive(({ ctx }) => ({
    isAdmin: ctx.role === "admin",
  }));

const g = roleGuard.for({ userId: "1", role: "admin" });
g.isAdmin; // true
```

```ts
// Empty object — equivalent to no arguments
const guard = defineGuard<Ctx>()({});
```

```ts
// fields only — no policy needed
const guard = defineGuard<Ctx>()({
  fields: ["id", "email", "name"],
});
guard.fields; // ["id", "email", "name"]
```

```ts
// policy only — fields defaults to []
const guard = defineGuard<Ctx>()({
  policy: { admin: true, user: false },
});
```

### 6. Derive Extra Properties

Use `.withDerive()` to compute additional properties from the context:

```ts
const guard = defineGuard<Ctx>()({
  fields: ["id", "email"],
  policy: { public: true },
}).withDerive(({ ctx }) => ({
  isAdmin: ctx.role === "admin",
}));

const g = guard.for({ userId: "1", role: "admin" });
g.isAdmin; // true
```

### 7. Row-Level Filtering with `withDerive`

`withDerive` can also produce **row-level filter conditions** (similar to RLS) from the context. This lets you co-locate both row-level and field-level access rules in a single guard definition.

#### Example with Drizzle ORM

```ts
import { eq } from "drizzle-orm";
import { defineGuard } from "field-guard";

type Ctx = { userId: string; role: "admin" | "user" };
type Post = { id: string; content: string; authorId: string };

const postGuard = defineGuard<Ctx>()({
  fields: ["id", "content", "authorId"],
  policy: {
    owner: true,
    other: { id: true, content: true },
  },
})
  .withDerive(({ ctx }) => ({
    where: ctx.role === "admin"
      ? undefined
      : eq(posts.authorId, ctx.userId),
  }))
  .withCheck<Post>()(({ ctx, target, verdictMap }) => {
    const level = ctx.userId === target.authorId ? "owner" : "other";
    return verdictMap[level];
  });
```

#### Usage

```ts
const g = postGuard.for({ userId: "1", role: "user" });

// Row-level: apply the derived `where` condition to your query
const rows = await db.select().from(posts).where(g.where);

// Field-level: pick only allowed fields per row
const results = rows.map((row) => g.check(row).pick(row));
```

> **Row-level** filtering decides *which rows* a user can access.
> **Field-level** filtering decides *which fields* are visible in each row.
> By combining both in a single guard, your access rules stay in one place.

### 8. Combine Multiple Guards

Use `combineGuards` to bundle guards for different resources and bind them all at once:

```ts
import { combineGuards } from "field-guard";

const guards = combineGuards<Ctx>()({
  users: userGuard,
  posts: postGuard,
});

const g = guards.for({ userId: "1", role: "user" });

g.users.check({ id: "1", email: "a@b.com", name: "A" });
g.posts.check({ id: "p1", content: "hello", authorId: "1" });
```

### 9. Merge Verdicts

Merge multiple verdicts with `union` (any-of) or `intersection` (all-of) strategy:

```ts
import { mergeFieldVerdicts } from "field-guard";

// Union: field is allowed if ANY verdict allows it
mergeFieldVerdicts("union", [verdictA, verdictB], fields);

// Intersection: field is allowed only if ALL verdicts allow it
mergeFieldVerdicts("intersection", [verdictA, verdictB], fields);
```

This is also available as `mergeVerdicts` on every guard instance:

```ts
const guard = defineGuard<Ctx>()({ /* ... */ });

const verdict = guard.mergeVerdicts("union", { owner: true, admin: false });
```

## API Reference

### `defineGuard<Context>()`

Returns a factory function that accepts an optional `{ fields?, policy? }` object and returns a guard chain. Both `fields` and `policy` can be omitted — the argument itself can also be omitted entirely.

### Guard Chain Methods

| Method                    | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `.withDerive(fn)`         | Add derived properties computed from context                       |
| `.withCheck<Target>()(fn)` | Add a `check(target)` method that resolves a verdict per target   |
| `.for(ctx)`               | Bind context and return the resolved guard object                  |

### Guard Base Properties

| Property        | Description                                              |
| --------------- | -------------------------------------------------------- |
| `fields`        | The full list of field names                             |
| `verdictMap`    | Pre-computed `FieldVerdictMap` for each level            |
| `mergeVerdicts` | Helper to merge verdicts by level flags                  |

### `combineGuards<Context>()(guards)`

Combines multiple guards into a single object with a shared `.for(ctx)` method.

### `mergeFieldVerdicts(mode, verdicts, fields)`

Merges an array of `FieldVerdict` objects using `"union"` or `"intersection"` strategy.

### `FieldVerdict<F>`

| Property         | Type                    | Description                              |
| ---------------- | ----------------------- | ---------------------------------------- |
| `allowedFields`  | `F[]`                   | List of allowed field names              |
| `coversAll(fs)`  | `(fields: F[]) => boolean` | `true` if all given fields are allowed |
| `coversSome(fs)` | `(fields: F[]) => boolean` | `true` if any given field is allowed   |
| `pick(obj)`      | `(obj: T) => Partial<T>` | Pick only allowed fields from an object |

## License

MIT
