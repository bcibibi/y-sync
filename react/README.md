# @bcibibi/y-react

> Beta: this package is currently in beta and APIs/behavior may evolve.

React layer for integrating y-sync in a frontend application.

This package exposes:

- `YSyncClientReact`
- `useYSyncClient`
- `useYDocument`
- `useY`

## Installation

Install the module and peer dependencies:

```bash
npm install @bcibibi/y-react react react-dom yjs
```

## Module Usage

Wrap your app with `YSyncClientReact`, then consume documents with `useYDocument`.

```tsx
import React from 'react'
import { YSyncClientReact, useYDocument, useY } from '@bcibibi/y-react'

function Editor() {
	const doc = useYDocument('demo-doc')
	const root = doc?.getMap<{ title: string }>('root')
	const title = useY(root, 'title', { deep: true })

	return <h1>{title ?? 'Untitled document'}</h1>
}

export default function App() {
	return (
		<YSyncClientReact
			url='ws://localhost:1234'
			onError={(error) => console.error('y-sync error', error)}
		>
			<Editor />
		</YSyncClientReact>
	)
}
```

### Notes

- `YSyncClientReact` creates and manages the WebSocket client lifecycle.
- `useYDocument(docId)` subscribes to a collaborative `Y.Doc`.
- `useY(...)` subscribes React rendering to Yjs map/array changes.
- Yjs overrides from `@bcibibi/y-utils/override` are loaded automatically by this package.

## See Also

- Server setup: [../server/README.md](../server/README.md)
- Client API details: [../client/README.md](../client/README.md)

