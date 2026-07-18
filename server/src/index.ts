import http from 'http';
import { YSyncWebSocket } from './websocket/websocket.js';
import { sync } from './middleware/sync.js';
import { YSyncAwareness } from './middleware/awareness.js';
import type { YDocProvider } from './provider/YDocProvider.js';
import { MemoryYDocProvider } from './provider/MemoryYDocProvider.js';
import * as Y from 'yjs';
import type { YSyncSocket } from './websocket/socket.js';
import type { YSyncOptions, YSyncWebSocketOptions, YSyncAwarenessOptions } from './types/options.js';
import type { YSyncMiddleware, YSyncAction } from './types/middleware.js';

export type {
    YSyncMiddleware,
    YSyncAction,
    YSyncOptions,
    YSyncWebSocketOptions,
    YSyncAwarenessOptions,
}

export { MemoryYDocProvider } from './provider/MemoryYDocProvider.js';
export { RedisYDocProvider } from './provider/RedisYDocProvider.js';

export class YSync {
    private provider: YDocProvider;
    private ws: YSyncWebSocket;
    private awareness: YSyncAwareness;
    private middleware: YSyncMiddleware[] = [];

    constructor(private server: http.Server, private options?: YSyncOptions) {
        this.provider = options?.provider ?? new MemoryYDocProvider();
        this.ws = new YSyncWebSocket(server, { provider: this.provider });
        this.awareness = new YSyncAwareness(options?.awareness);
        this.ws.on('error', (error) => console.error('WebSocket error:', error));
        this.ws.use(this.handleSync.bind(this));
        this.ws.use(this.awareness.middleware.bind(this.awareness));
    }

    use(cb: YSyncMiddleware) {
        this.middleware.push(cb);
    }

    private handleSync(socket: YSyncSocket, options: YSyncWebSocketOptions) {
        sync(socket, options, { onCreate: this.handleCreate.bind(this), onUpdate: this.handleUpdate.bind(this), onDestroy: this.handleDestroy.bind(this) });
    }

    private handleCreate(doc: Y.Doc) {
        Y.transact(doc, () => {
            this.middleware.forEach((cb) => cb(doc, 'create'));
        }, 'middleware');
    }

    private handleUpdate(doc: Y.Doc, origin: any) {
        if (origin !== 'middleware') {
            Y.transact(doc, () => {
                this.middleware.forEach((cb) => cb(doc, 'update', origin));
            }, 'middleware');
        }
    }

    private handleDestroy(doc: Y.Doc) {
        this.middleware.forEach((cb) => cb(doc, 'delete'));
    }

    close(cb?: (err?: Error) => void) {
        this.awareness.close();
        this.ws.close(err => {
            if (err) {
                cb?.(err);
                return;
            } else {
                this.server.close(cb);
            }
        });
    }
}