# field-guard

A lightweight, fully type-safe, field-level access control library for TypeScript.

Define **who** can see **which fields** of your data — with zero runtime dependencies.

## Features

- 🔒 **Field-level access control** — Grant or deny access per field, per access level
- 🏗️ **Builder pattern API** — Chainable `.withDerive()` and `.withCheck()` for composable guards
- 🔀 **Merge strategies** — Combine multiple verdicts via `union` or `intersection`
- 🧩 **Composable** — Combine multiple guards into a single object with `combineGuards`
- 🦺 **Fully type-safe** — All fields, levels, and results are inferred from your definitions

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

Each `FieldVerdict` comes with two convenience methods:

```ts
verdict.coversAll(["id", "name"]);  // true — all requested fields are allowed
verdict.coversSome(["email"]);      // true — at least one requested field is allowed
```

### 5. Derive Extra Properties

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

### 6. Combine Multiple Guards

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

### 7. Merge Verdicts

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

Returns a factory function that accepts `{ fields, policy }` and returns a guard chain.

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

## License

MIT
