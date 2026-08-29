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

## Server Middleware Usage

Register your Mongoose models before creating the y-sync server. The middleware reads the model name and document id from the Yjs document metadata, loads the MongoDB document when it is created, and saves later updates back to MongoDB.

```ts
import { createServer } from 'node:http'
import mongoose from 'mongoose'
import { YSyncServer } from '@bcibibi/y-sync-server'
import { ySyncMongooseMiddleware } from '@bcibibi/y-sync-middleware-mongoose/middleware'

await mongoose.connect(process.env.MONGODB_URI!)

mongoose.model('Article', new mongoose.Schema({
	title: String,
	content: String
}))

const httpServer = createServer()
const syncServer = new YSyncServer(httpServer)

syncServer.use(ySyncMongooseMiddleware({
	wait: 1_000
}))

httpServer.listen(1234)
```

Use the matching client to create a document with the required `model` and `id` metadata:

```ts
import { YSyncMongoose } from '@bcibibi/y-sync-middleware-mongoose/client'

const client = new YSyncMongoose('ws://localhost:1234/ysync')
const article = await client.getMongooseDocument('Article', 'YOUR_MONGODB_DOCUMENT_ID')

article.set('title', 'Updated title')
```

The document must exist in MongoDB before the first client connection. On `create`, the middleware retrieves it and populates the Yjs map. On `update`, it writes the map's JSON representation with `model.updateOne({ _id: id }, data)` after the configured delay.

## Middleware Options

Pass options to `ySyncMongooseMiddleware(options)`:

- `wait?: number`: debounce delay in milliseconds before persisting an update. Defaults to `3000`.
- `object?: ToObjectOptions`: options passed to Mongoose's `document.toObject()`. Defaults flatten `ObjectId`, UUID, and map values, and remove the version key.
- `create?: (model, doc, transaction) => void | Promise<void>`: callback after a Mongoose document has been loaded into the Yjs map.
- `update?: (model, doc, transaction) => void | Promise<void>`: callback before an updated Yjs map is persisted.

Use the provided `transaction` callback for every Yjs mutation performed in `create` or `update` callbacks:

```ts
const middleware = ySyncMongooseMiddleware({
	wait: 1_000,
	create: (_model, doc, transaction) => {
		transaction(() => {
			doc.set('loadedAt', new Date().toISOString())
		})
	},
	update: async (model, doc) => {
		console.log(`Saving ${model.modelName}:`, doc.toJSON())
	}
})

syncServer.use(middleware)
```

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
