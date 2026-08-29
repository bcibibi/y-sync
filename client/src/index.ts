import { EventEmitter } from "eventemitter3";
import { YDocumentProvider } from "./document/provider.js";
import { YSyncDocument } from "./document/sync.js";
import { YSyncClientWebSocket } from "./websocket/websocket.js";
import * as Y from "yjs";
import { YSyncAwareness } from "./awareness/sync.js";
import type { YSyncClientOptions } from "./types/options.js";
import type { YSyncClientEvents } from "./types/client.js";

export type {
    YSyncClientOptions,
}

export class YSyncClient {

    private events: EventEmitter<YSyncClientEvents>;
    private ws: YSyncClientWebSocket;
    private provider: YDocumentProvider;
    private syncDocument: YSyncDocument;
    private syncAwareness: YSyncAwareness;

    get id() {
        return this.ws.id;
    }

    get connected() {
        return this.ws.connected;
    }

    constructor(private url: string, options?: YSyncClientOptions) {
        this.events = new EventEmitter<YSyncClientEvents>();
        this.provider = new YDocumentProvider();
        this.ws = new YSyncClientWebSocket(url, options ? options : {});
        this.ws.on('connect', () => {
            this.events.emit('connect');
        });
        this.ws.on('disconnect', () => {
            this.events.emit('disconnect');
        });
        this.ws.on('reconnect', () => {
            this.events.emit('reconnect');
        });
        this.ws.on('error', (error: unknown) => {
            this.events.emit('error', error);
        });
        this.syncDocument = new YSyncDocument(this.ws, this.provider);
        this.syncAwareness = new YSyncAwareness(this.ws);
    }

    on<EventKey extends keyof YSyncClientEvents>(event: EventKey, listener: (...data: YSyncClientEvents[EventKey]) => void) {
        this.events.on(event, listener);
    }

    once<EventKey extends keyof YSyncClientEvents>(event: EventKey, listener: (...data: YSyncClientEvents[EventKey]) => void) {
        this.events.once(event, listener);
    }

    off<EventKey extends keyof YSyncClientEvents>(event: EventKey, listener: (...data: YSyncClientEvents[EventKey]) => void) {
        this.events.off(event, listener);
    }

    connect() {
        this.ws.connect();
    }

    async getYDocument(id: string, meta: Record<string, any> = {}): Promise<Y.Doc> {
        let doc = this.provider.getYDocument(id);
        if (doc) {
            return doc;
        }
        doc = await new Promise<Y.Doc>((resolve, reject) => {
            this.syncDocument.sync(new Y.Doc({ guid: id, meta }), (err, doc) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(doc);
            });
        });
        return doc;
    }

    getAwareness() {
        return this.syncAwareness.awareness;
    }

    close() {
        this.ws.once('disconnect', () => {
            this.ws.removeAllListeners();
        });
        this.ws.disconnect();
    }
}
