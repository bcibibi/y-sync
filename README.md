# y-sync

> Beta: this project is currently in beta and APIs/behavior may evolve.

TypeScript monorepo for building real-time collaborative experiences with Yjs.

The project is organized as npm workspaces and provides:

- a Yjs WebSocket client,
- a synchronization server,
- a Redis module for persistence/distribution,
- a Mongoose middleware,
- shared utilities,
- a React integration layer,
- an integration test workspace.

## Project Structure

- `client` - package `@bcibibi/y-sync-client`
- `server` - package `@bcibibi/y-sync-server`
- `redis` - package `@bcibibi/y-sync-redis`
- `middleware/mongoose` - package `@bcibibi/y-sync-middleware-mongoose`
- `utils` - package `@bcibibi/y-utils`
- `react` - package `@bcibibi/y-react`
- `test` - workspace `@bcibibi/y-sync-test`

## Prerequisites

- Node.js LTS
- npm

## Installation

```bash
npm install
```

## Build All Modules

```bash
npm run build
```

## Tests

From the repository root:

```bash
npm -w test run test
```

Watch mode:

```bash
npm -w test run test:watch
```

## Module Documentation

- [client/README.md](client/README.md)
- [server/README.md](server/README.md)
- [redis/README.md](redis/README.md)
- [middleware/mongoose/README.md](middleware/mongoose/README.md)
- [utils/README.md](utils/README.md)
- [react/README.md](react/README.md)
- [test/README.md](test/README.md)

## Project Governance

- [CHANGELOG.md](CHANGELOG.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)