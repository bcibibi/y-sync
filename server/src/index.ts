import http from 'http';
import { YSyncWebSocket } from './websocket/websocket.js';
import { sync } from './middleware/sync.js';
import { YSyncAwareness } from './middleware/awareness.js';
import type { YDocProvider } from './provider/YDocProvider.js';
import { MemoryYDocProvider } from './provider/MemoryYDocProvider.js';
import * as Y from 'yjs';
import type { YSyncSocket } from './websocket/socket.js';
import type { YSyncOptions, YSyncWebSocketOptions, YSyncAwarenessOptions } from './types/options.js';
import type { YSyncMiddleware, YSyncAction, YSyncTransaction } from './types/middleware.js';
import type { YSyncWebSocketAuthFct } from './types/websocket.js';

export type {
    YSyncMiddleware,
    YSyncAction,
    YSyncOptions,
    YSyncWebSocketOptions,
    YSyncAwarenessOptions,
    YSyncTransaction,
    YSyncWebSocketAuthFct
}

export { MemoryYDocProvider } from './provider/MemoryYDocProvider.js';
export { RedisYDocProvider } from './provider/RedisYDocProvider.js';

export class YSyncServer {
    private provider: YDocProvider;
    private ws: YSyncWebSocket;
    private awareness: YSyncAwareness;
    private middleware: YSyncMiddleware[] = [];

    constructor(private server: http.Server, private options?: YSyncOptions) {
        this.provider = options?.provider ?? new MemoryYDocProvider();
        this.ws = new YSyncWebSocket(server, { provider: this.provider, path: options?.path || "/ysync" });
        this.awareness = new YSyncAwareness(options?.awareness);
        this.ws.on('error', (error) => console.error('WebSocket error:', error));
        this.ws.use(this.handleSync.bind(this));
        this.ws.use(this.awareness.middleware.bind(this.awareness));
    }

    auth(authFct: YSyncWebSocketAuthFct) {
        this.ws.auth(authFct);
    }

    use(cb: YSyncMiddleware) {
        this.middleware.push(cb);
    }


    private handleSync(socket: YSyncSocket, options: YSyncWebSocketOptions) {
        sync(socket, options, {
            onCreate: this.handleCreate.bind(this),
            onUpdate: this.handleUpdate.bind(this),
            onDestroy: this.handleDestroy.bind(this)
        });
    }

    private handleMiddlewareTransaction(doc: Y.Doc): YSyncTransaction {
        return <R>(cb: () => R) => Y.transact(doc, cb, 'middleware');
    }

    private async handleCreate(doc: Y.Doc, err: (err: any) => void) {
        for (const cb of this.middleware) {
            await cb(doc, 'create', this.handleMiddlewareTransaction(doc), undefined, err);
        }
    }

    private async handleUpdate(doc: Y.Doc, origin: any, err: (err: any) => void) {
        if (origin !== 'middleware') {
            for (const cb of this.middleware) {
                await cb(doc, 'update', this.handleMiddlewareTransaction(doc), origin, err);
            }
        }
    }

    private async handleDestroy(doc: Y.Doc, err: (err: any) => void) {
        for (const cb of this.middleware) {
            await cb(doc, 'delete', this.handleMiddlewareTransaction(doc), undefined, err);
        }
    }

    close(cb?: (err?: Error) => void) {
        this.awareness.close();
        this.ws.close(cb);
    }
}