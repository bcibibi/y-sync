# @bcibibi/y-sync-client

> Beta: this package is currently in beta and APIs/behavior may evolve.

Yjs client for synchronizing a document over WebSocket.

## Installation

```bash
npm install @bcibibi/y-sync-client yjs
```

## Quick Usage

```ts
import { YSyncClient } from '@bcibibi/y-sync-client'

const client = new YSyncClient('ws://localhost:1234')

// Fetch (or create) a collaborative Y.Doc by id
const ydoc = await client.getYDocument('demo-doc')

// Access shared awareness state if needed
const awareness = client.getAwareness()

// Close the underlying WebSocket when done
client.close()
```

In Node.js environments, pass a WebSocket implementation:

```ts
import WebSocket from 'ws'
import { YSyncClient } from '@bcibibi/y-sync-client'

const client = new YSyncClient('ws://localhost:1234', {
  websocket: WebSocket,
  headers: { Authorization: 'Bearer your-token' }
})
```

Browsers use `globalThis.WebSocket` automatically. Native WebSocket implementations
(including those provided by browsers and Node.js) do not support custom HTTP
headers. Setting non-empty `headers` with the native implementation throws an
error. To send custom headers in Node.js, pass a compatible implementation such
as `ws` as shown above. Browser authentication must use a browser-supported
mechanism, such as cookies configured by your server.

## Options

`YSyncClient` constructor signature:

```ts
new YSyncClient(url: string, options?: YSyncClientOptions)
```

Available options:

- `autoconnect?: boolean` (default: `true`)
  - Automatically opens the WebSocket connection when the client is created.
  - Set to `false` to delay automatic connection behavior.

- `reconnectInterval?: number` (default: `5000`)
  - Reconnect check interval in milliseconds.
  - If no message is received within this interval, the client triggers a reconnect attempt.

- `websocket?: YSyncWebSocketConstructor`
  - Custom WebSocket constructor.
  - Required in environments where `globalThis.WebSocket` is not available (typically Node.js).

- `headers?: Record<string, string>`
  - Custom HTTP headers sent during the WebSocket handshake.
  - Requires an implementation supporting `new WebSocket(url, undefined, { headers })`, such as `ws` in Node.js.
  - Not supported by native browser or Node.js WebSocket implementations.

Example with options:

```ts
import WebSocket from 'ws'
import { YSyncClient } from '@bcibibi/y-sync-client'

const client = new YSyncClient('ws://localhost:1234', {
  autoconnect: true,
  reconnectInterval: 3000,
  websocket: WebSocket
})
```

See also the React demo: [../react/README.md](../react/README.md)
