import EventEmitter from "events";
import { YDocumentProvider } from "./document/provider.js";
import { YSyncDocument } from "./document/sync.js";
import { YSyncClientWebSocket } from "./websocket/websocket.js";
import * as Y from "yjs";
import { YSyncAwareness } from "./awareness/sync.js";
import type { YSyncClientWebSocketOptions } from "./model/options.js";

interface YSyncClientEvents {
    connect: [];
    reconnect: [];
    disconnect: [];
    error: [error: Event];
}

export class YSyncClient extends EventEmitter<YSyncClientEvents> {

    private ws: YSyncClientWebSocket;
    private provider: YDocumentProvider;
    private syncDocument: YSyncDocument;
    private syncAwareness: YSyncAwareness;

    constructor(private url: string, options?: YSyncClientWebSocketOptions) {
        super();
        this.provider = new YDocumentProvider();
        this.ws = new YSyncClientWebSocket(url, options ? options : {});
        this.ws.on('connect', () => {
            this.emit('connect');
        });
        this.ws.on('disconnect', () => {
            this.emit('disconnect');
        });
        this.ws.on('reconnect', () => {
            this.emit('reconnect');
        });
        this.ws.on('error', (error) => {
            this.emit('error', error);
        });
        this.syncDocument = new YSyncDocument(this.ws, this.provider);
        this.syncAwareness = new YSyncAwareness(this.ws);
    }


    async getYDocument(id: string) {
        let doc = this.provider.getYDocument(id);
        if (doc) {
            return doc;
        }
        doc = await new Promise<Y.Doc>((resolve, reject) => {
            this.syncDocument.sync(new Y.Doc({ guid: id }), resolve);
        });
        return doc;
    }

    getAwareness() {
        return this.syncAwareness.awareness;
    }

    close() {
        this.ws.disconnect();
    }
}
