import * as Y from "yjs";
import type { YSyncRedisClient } from "./client";
import EventEmitter from "events";

export class YSyncRedisDocs extends EventEmitter {
    private items: Map<string, Y.Doc> = new Map();

    constructor(private client: YSyncRedisClient) {
        super();
        client.on('syncStep1', this.handleSyncStep1.bind(this));
        client.on('syncStep2', this.handleSyncStep2.bind(this));
        client.on('syncUpdate', this.handleSyncUpdate.bind(this));
    }

    private createDocument(docId: string): Y.Doc {
        const doc = new Y.Doc();
        this.emitSyncStep1(doc);
        doc.on('update', this.handleDocumentUpdate.bind(this));
        doc.on('destroy', this.handleRemoveDocument.bind(this));
        this.items.set(docId, doc);
        return doc;
    }

    private handleRemoveDocument(doc: Y.Doc) {
        this.items.delete(doc.guid);
    }

    private handleDocumentUpdate(update: Uint8Array, origin: any, doc: Y.Doc, transaction: Y.Transaction) {
        if (origin !== this.client) {
            this.emitSyncUpdate(doc, update);
        }
    }

    private handleSyncStep1(docId: string, update: Uint8Array) {
        let doc: Y.Doc = this.items.get(docId) || this.createDocument(docId);
        this.emitSyncStep2(doc, update);
    }

    private handleSyncStep2(docId: string, update: Uint8Array) {
        let doc = this.items.get(docId);
        if (!doc) {
            return; // Document not found, ignore the update
        }
        Y.applyUpdate(doc, update, this.client);
        this.emit('synced:' + doc.guid, doc);
    }

    private handleSyncUpdate(docId: string, update: Uint8Array) {
        let doc = this.items.get(docId);
        if (!doc) {
            return; // Document not found, ignore the update
        }
        Y.applyUpdate(doc, update, this.client);
    }

    private emitSyncStep1(doc: Y.Doc) {
        this.client.send('syncStep1', doc.guid, Y.encodeStateVector(doc));
    }

    private emitSyncStep2(doc: Y.Doc, update: Uint8Array) {
        this.client.send('syncStep2', doc.guid, Y.encodeStateAsUpdate(doc, update));
    }

    private emitSyncUpdate(doc: Y.Doc, update: Uint8Array) {
        this.client.send('syncUpdate', doc.guid, update);
    }

    async getDocument(docId: string): Promise<Y.Doc> {
        let doc = this.items.get(docId);
        if (!doc) {
            doc = this.createDocument(docId);
            await new Promise<void>((resolve) => this.once('synced:' + docId, () => resolve()));
        }
        return doc;
    }
}