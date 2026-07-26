# @bcibibi/y-sync-redis

> Beta: this package is currently in beta and APIs/behavior may evolve.

Redis module for persistence and cross-instance synchronization around Yjs.

## Installation

```bash
npm install @bcibibi/y-sync-redis ioredis yjs
```

## Typical Integration

This package is usually plugged behind `@bcibibi/y-sync-server` to share documents across multiple server nodes.

## Implementation Example

```ts
import Redis from 'ioredis'
import * as Y from 'yjs'
import { YSyncRedis } from '@bcibibi/y-sync-redis'

const pub = new Redis('redis://127.0.0.1:6379')
const sub = new Redis('redis://127.0.0.1:6379')

const sync = new YSyncRedis({
	pub,
	sub,
	ttl: 3600
})

sync.on('connected', () => {
	console.log('Connected to Redis transport')
})

sync.on('error', (err) => {
	console.error('YSyncRedis error:', err)
})

sync.use(async (doc, action, update, origin) => {
	if (action === 'create') {
		console.log('Created:', doc.guid)
		return
	}

	if (action === 'update') {
		console.log('Updated:', doc.guid, 'bytes:', update?.byteLength ?? 0, 'origin:', origin)
		return
	}

	if (action === 'delete') {
		console.log('Deleted:', doc.guid)
	}
}, 'app-middleware')

await sync.withDocument('demo-doc', (doc) => {
	const text = doc.getText('content')
	text.insert(0, 'hello from redis sync')
})

const doc = await sync.getDocument('demo-doc')

// Optional cleanup when your process exits
pub.disconnect()
sub.disconnect()
```

### Options

- `pub`: ioredis publisher client (required)
- `sub`: ioredis subscriber client (required)
- `ttl`: document TTL in seconds (optional, default: `3600`)
