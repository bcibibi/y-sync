import { EventEmitter } from "eventemitter3";
import type { YSyncClientWebSocket } from "../websocket/websocket.js";
import * as Y from "yjs";
import type { YDocumentProvider } from "./provider.js";
import debug from "debug";

const log = debug("y-sync:client:sync");

export class YSyncDocument extends EventEmitter {

    constructor(private ws: YSyncClientWebSocket, private provider: YDocumentProvider) {
        super();
        this.ws.on('reconnect', this.handleReconnect.bind(this));
        this.ws.on('syncStep1', this.handleSyncStep1.bind(this));
        this.ws.on('syncStep2', this.handleSyncStep2.bind(this));
        this.ws.on('syncUpdate', this.handleSyncUpdate.bind(this));
    }

    sync(doc: Y.Doc, cb?: (doc: Y.Doc) => void) {
        this.provider.addYDocument(doc);
        doc.on('destroy', this.handleDocDestroy.bind(this));
        this.once('synced:' + doc.guid, (doc: Y.Doc) => {
            log('Document synced:', doc.guid);
            doc.on('update', this.handleDocUpdate.bind(this));
            cb?.(doc);
        });
        this.syncStep1(doc);
    }

    private syncStep1(doc: Y.Doc) {
        this.ws.send('syncStep1', doc.guid, Y.encodeStateVector(doc), JSON.stringify(doc.meta));
    }

    private syncStep2(doc: Y.Doc, update: Uint8Array) {
        this.ws.send('syncStep2', doc.guid, Y.encodeStateAsUpdate(doc, update));
    }

    private handleSyncStep1(docId: string, update: Uint8Array) {
        const doc = this.provider.getYDocument(docId);
        if (!doc) {
            console.error(`Document with id ${docId} not found`);
            return;
        }
        this.syncStep2(doc, update);
    }

    private handleSyncStep2(docId: string, update: Uint8Array) {
        const doc = this.provider.getYDocument(docId);
        if (!doc) {
            console.error(`Document with id ${docId} not found`);
            return;
        }
        Y.applyUpdate(doc, update, this);
        this.emit('synced:' + docId, doc);
    }

    private handleSyncUpdate(docId: string, update: Uint8Array) {
        const doc = this.provider.getYDocument(docId);
        if (!doc) {
            console.error(`Document with id ${docId} not found`);
            return;
        }
        Y.applyUpdate(doc, update, this);
    }

    private handleDocUpdate(update: Uint8Array, transactionOrigin: any, doc: Y.Doc, transaction: Y.Transaction) {
        if (transactionOrigin === this) {
            return;
        }
        this.ws.send('syncUpdate', doc.guid, update);
    }

    private handleDocDestroy(doc: Y.Doc) {
        log('Document destroyed:', doc.guid);
        this.provider.removeYDocument(doc.guid);
        this.ws.send('syncDestroy', doc.guid);
    }

    private handleReconnect() {
        log('WebSocket reconnected, resyncing documents...');
        this.provider.forEach((doc) => {
            log('Resyncing document with id:', doc.guid);
            this.syncStep1(doc);
        });
    }
}