# @bcibibi/y-sync-middleware-mongoose

> Beta: this package is currently in beta and APIs/behavior may evolve.

Mongoose middleware to plug persistence for collaborative Yjs documents.

## Installation

```bash
npm install @bcibibi/y-sync-middleware-mongoose mongoose yjs
```

## Available Exports

- `@bcibibi/y-sync-middleware-mongoose/client`
- `@bcibibi/y-sync-middleware-mongoose/middleware`

## Yjs Override Details

This module relies on Yjs runtime overrides from `@bcibibi/y-utils/override`.

Why it matters:

- the middleware uses `Y.Map#setObject(...)` to map Mongoose objects into Yjs,
- typed conversions (`string`, `number`, `boolean`, `Date`, arrays, nested objects) depend on those overrides,
- `toJSON()` returns normalized plain values expected for MongoDB updates.

Good news: both entrypoints import overrides automatically:

- `@bcibibi/y-sync-middleware-mongoose/client`
- `@bcibibi/y-sync-middleware-mongoose/middleware`

You only need a manual import if you use Yjs helpers directly outside these entrypoints:

```ts
import '@bcibibi/y-utils/override'
```
