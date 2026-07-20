import * as Y from "yjs";
import type { YSyncRedisClient } from "./client.js";
import type { YSyncRedisMiddleware } from "./middleware.js";
import debug from "debug";
import { YSyncRedisDocs } from "./docs.js";

const log = debug("y-sync:redis:sync");

export class YSyncRedisSync {
    private docs: YSyncRedisDocs;

    constructor(private client: YSyncRedisClient, private ttl: number, private middleware: YSyncRedisMiddleware) {
        this.docs = new YSyncRedisDocs(ttl, this.handleCreateDocument.bind(this));
        client.on('syncStep1', this.handleSyncStep1.bind(this));
        client.on('syncStep2', this.handleSyncStep2.bind(this));
        client.on('syncUpdate', this.handleSyncUpdate.bind(this));
    }

    private async handleCreateDocument(doc: Y.Doc, origin: any) {
        log(`Creating new document with id: ${doc.guid}`);
        if (origin === 'local') {
            await this.middleware.create(doc);
        }
        this.emitSyncStep1(doc);
        doc.on('update', this.handleDocumentUpdate.bind(this));
        doc.on('destroy', this.handleDocumentDestroy.bind(this));
    }

    private async handleDocumentDestroy(doc: Y.Doc) {
        try {
            log(`Document with id: ${doc.guid} is being destroyed`);
            await this.middleware.delete(doc);
        } catch (err) {
            console.error(`Error handling document destroy for document ${doc.guid}:`, err);
        }
    }

    private async handleDocumentUpdate(update: Uint8Array, origin: any, doc: Y.Doc, transaction: Y.Transaction) {
        try {
            if (origin !== this.client) {
                this.emitSyncUpdate(doc, update);
                await this.middleware.update(doc, update, origin);
            }
        } catch (err) {
            console.error(`Error handling document update for document ${doc.guid}:`, err);
        }
    }

    private async handleSyncStep1(clientId: string, docId: string, update: Uint8Array) {
        try {
            if (clientId === this.client.id) {
                return; // Ignore updates from the same client
            }
            log(`Received syncStep1 for document ${docId} from client ${clientId}`);
            let doc = await this.docs.get(docId, true);
            this.emitSyncStep2(doc, update);
        } catch (err) {
            console.error(`Error handling syncStep1 for document ${docId}:`, err);
        }
    }

    private async handleSyncStep2(clientId: string, docId: string, update: Uint8Array) {
        try {
            if (clientId === this.client.id) {
                return; // Ignore updates from the same client
            }
            let doc = await this.docs.get(docId);
            if (!doc) {
                return; // Document not found, ignore the update
            }
            log(`Received syncStep2 for document ${docId} from client ${clientId}`);
            Y.applyUpdate(doc, update, this.client);
        } catch (err) {
            console.error(`Error in middleware synced for document ${docId}:`, err);
        }

    }

    private async handleSyncUpdate(clientId: string, docId: string, update: Uint8Array) {
        try {
            if (clientId === this.client.id) {
                return; // Ignore updates from the same client
            }
            let doc = await this.docs.get(docId);
            if (!doc) {
                return; // Document not found, ignore the update
            }
            Y.applyUpdate(doc, update, this.client);
        } catch (err) {
            console.error(`Error handling syncUpdate for document ${docId}:`, err);
        }
    }

    private emitSyncStep1(doc: Y.Doc) {
        this.client.send('syncStep1', this.client.id, doc.guid, Y.encodeStateVector(doc));
    }

    private emitSyncStep2(doc: Y.Doc, update: Uint8Array) {
        this.client.send('syncStep2', this.client.id, doc.guid, Y.encodeStateAsUpdate(doc, update));
    }

    private emitSyncUpdate(doc: Y.Doc, update: Uint8Array) {
        this.client.send('syncUpdate', this.client.id, doc.guid, update);
    }

    async getDocument(docId: string, meta: Record<string, any>): Promise<Y.Doc> {
        return this.client.lock(docId, () => this.docs.get(docId, true, 'local', meta))
    }
}