# @bcibibi/y-sync-server

> Beta: this package is currently in beta and APIs/behavior may evolve.

Yjs synchronization server over WebSocket.

## Installation

```bash
npm install @bcibibi/y-sync-server yjs
```

## Minimal Example

```ts
import { createServer } from 'node:http'
import { YSyncServer } from '@bcibibi/y-sync-server'

const httpServer = createServer()
const syncServer = new YSyncServer(httpServer)

httpServer.listen(1234)

// Clients connect to ws://localhost:1234/ysync by default

// Optional: graceful shutdown
process.on('SIGINT', () => {
  syncServer.close((err) => {
    if (err) console.error(err)
    process.exit(err ? 1 : 0)
  })
})
```

## Server Options

Pass options as the second argument to `YSyncServer`:

```ts
const syncServer = new YSyncServer(httpServer, {
  path: '/collaboration'
})
```

- `provider?: YDocProvider`: document provider. Defaults to `MemoryYDocProvider`.
- `awareness?: YSyncAwarenessOptions`: awareness configuration.
- `path?: string`: WebSocket endpoint path. Defaults to `/ysync`.

With the example above, clients must use `ws://localhost:1234/collaboration`.

## Authentication

Register an authentication handler with `syncServer.auth(...)`. It runs before a WebSocket upgrade is accepted.

Call `next(true)` to accept the connection. Call `next(false)` or `next(new Error(...))` to reject it.

```ts
import { createServer } from 'node:http'
import { YSyncServer } from '@bcibibi/y-sync-server'

const httpServer = createServer()
const syncServer = new YSyncServer(httpServer, {
  path: '/collaboration'
})

syncServer.auth((request, _response, next) => {
  const authorization = request.headers.authorization
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined

  if (token !== process.env.YSYNC_TOKEN) {
    next(false)
    return
  }

  next(true)
})

httpServer.listen(1234)
```

The authentication handler signature is:

```ts
(request: IncomingMessage, response: unknown, next: (result: Error | boolean) => void) => void | Promise<unknown>
```

## Middleware Example

Use `syncServer.use(...)` to run custom logic on document lifecycle events.

```ts
import { createServer } from 'node:http'
import { YSyncServer } from '@bcibibi/y-sync-server'

const httpServer = createServer()
const syncServer = new YSyncServer(httpServer)

syncServer.use(async (doc, action, origin) => {
  if (action === 'create') {
    console.log('Document created:', doc.guid)
    return
  }

  if (action === 'update') {
    console.log('Document updated:', doc.guid, 'origin:', origin)
    return
  }

  if (action === 'delete') {
    console.log('Document deleted:', doc.guid)
  }
})

httpServer.listen(1234)
```

The middleware signature is:

```ts
(doc: Y.Doc, action: 'create' | 'update' | 'delete', origin?: any) => void | Promise<void>
```

## RedisYDocProvider Example

Use `RedisYDocProvider` to share document state across multiple server instances.

```ts
import { createServer } from 'node:http'
import Redis from 'ioredis'
import { YSyncServer, RedisYDocProvider } from '@bcibibi/y-sync-server'

const httpServer = createServer()

const pub = new Redis('redis://127.0.0.1:6379')
const sub = new Redis('redis://127.0.0.1:6379')

const provider = new RedisYDocProvider({ pub, sub })

const syncServer = new YSyncServer(httpServer, {
  provider
})

httpServer.listen(1234)

process.on('SIGINT', () => {
  syncServer.close((err) => {
    if (err) console.error(err)
    pub.disconnect()
    sub.disconnect()
    process.exit(err ? 1 : 0)
  })
})
```

Required options for `RedisYDocProvider`:

- `pub`: ioredis publisher client
- `sub`: ioredis subscriber client

For distributed persistence, see [../redis/README.md](../redis/README.md).
