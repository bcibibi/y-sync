# @bcibibi/y-utils

> Beta: this package is currently in beta and APIs/behavior may evolve.

Shared utilities for the y-sync suite.

## Installation

```bash
npm install @bcibibi/y-utils yjs
```

## Exports

- primary export: `@bcibibi/y-utils`
- secondary export: `@bcibibi/y-utils/override`

## YConverter

`YConverter` is exported by `@bcibibi/y-utils` and provides one main helper:

- `YConverter.toYjs(value, root?)`

It converts plain JavaScript values into the corresponding Yjs types.

### Conversion rules

- `string` -> `Y.Text` (`setText`)
- `number` -> `Y.Text` (`setNumber`)
- `boolean` -> `Y.Text` (`setBoolean`)
- `Date` -> `Y.Text` (`setDate`)
- Delta-like object (`{ ops: [...] }`) -> `Y.Text` (`applyDelta` + `__type = 'delta'`)
- `Array` -> `Y.Array`
- plain object -> `Y.Map`
- existing `Y.AbstractType` -> returned as-is

If a `root` value is provided, the converter reuses and updates that existing Yjs type instead of always creating a new one.

### Basic example

```ts
import { YConverter } from '@bcibibi/y-utils'

const yText = YConverter.toYjs('hello')
const yNumber = YConverter.toYjs(42)
const yObject = YConverter.toYjs({ title: 'Doc', published: true })
```

### Reuse an existing root

```ts
import * as Y from 'yjs'
import { YConverter } from '@bcibibi/y-utils'

const rootMap = new Y.Map<{ count: number }>()
const sameMap = YConverter.toYjs({ count: 1 }, rootMap)
```

## Yjs Overrides (`@bcibibi/y-utils/override`)

The `override` entrypoint patches Yjs prototypes at runtime.

Enable overrides with a side-effect import:

```ts
import '@bcibibi/y-utils/override'
```

### `Y.Text` additions

- `setText(value: string)` / `getText()`
- `setDate(value: Date)` / `getDate()`
- `setNumber(value: number)` / `getNumber()`
- `setBoolean(value: boolean)` / `getBoolean()`

Typed values are stored in `Y.Text` using an internal `__type` attribute.

### `Y.Text.toJSON()` behavior

- returns `string` by default
- returns `Date` when `__type = 'date'`
- returns `number` when `__type = 'number'`
- returns `boolean` when `__type = 'boolean'`
- returns HTML when `__type = 'html'` and `toHtml()` is available

### `Y.Map` overrides

- `set(key, value)` converts plain JS values to Yjs types through `YConverter.toYjs(...)`
- `getValue(key)` returns plain JS values (`toJSON()` for nested Yjs types)
- `setObject(value)` applies a full object using Yjs conversion rules

### `Y.Array` overrides

- `insert(index, values)` and `push(values)` auto-convert plain JS values to Yjs types
- `replace(values)` updates array content in place using conversion rules
- `getValue(index)` returns plain JS values (`toJSON()` for nested Yjs types)

### Notes

- Overrides are global once imported.
- This package also augments Yjs TypeScript types (module augmentation).
