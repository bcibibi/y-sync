import http from 'http';
import { YSyncWebSocket, type YSyncWebSocketOptions } from './websocket/websocket.js';
import { sync } from './middleware/sync.js';
import type { YDocProvider } from './provider/YDocProvider.js';
import { MemoryYDocProvider } from './provider/MemoryYDocProvider.js';
import * as Y from 'yjs';
import type { YSyncSocket } from './websocket/socket.js';

export interface YSyncOptions {
    provider?: YDocProvider; 
}

export type YSyncAction = 'create' | 'update';

export type YSyncMiddleware = (doc: Y.Doc, action: YSyncAction) => void;

export class YSync {
    private provider: YDocProvider;
    private ws: YSyncWebSocket;
    private middleware: YSyncMiddleware[] = [];

    constructor(private server: http.Server, private options?: YSyncOptions) { 
        this.provider = options?.provider ?? new MemoryYDocProvider();
        this.ws = new YSyncWebSocket(server, { provider: this.provider });
        this.ws.use(this.handleSync.bind(this));

        this.ws.on('connection', (socket) => {
            console.log("New YSyncSocket connection established");
            socket.on('test', (data) => {
                console.log("Received test event with data of type", typeof data, ":", data);
                socket.send('testResponse', { message: 'Hello from server!' });
            });
        });
    }

    use(cb: (doc: Y.Doc, action: YSyncAction) => void) {
        this.middleware.push(cb);
    }

    private handleSync(socket: YSyncSocket, options: YSyncWebSocketOptions) {
        sync(socket, options, { onCreate: this.handleCreate.bind(this), onUpdate: this.handleUpdate.bind(this) });
    }

    private handleCreate(doc: Y.Doc) {
        this.middleware.forEach((cb) => cb(doc, 'create'));
    }

    private handleUpdate(doc: Y.Doc) {
        this.middleware.forEach((cb) => cb(doc, 'update'));
    }

    close(cb?: (err?: Error) => void) {
        this.ws.close(cb);
    }
}