import type { YSyncSocket } from "../websocket/socket.js";
import { YDocProvider } from "./YDocProvider.js";
import * as Y from 'yjs';
import debug from 'debug';
import type { MemoryYDocEntry } from "../types/memoryprovider.js";

const log = debug('y-sync:server:memory-provider');

export class MemoryYDocProvider extends YDocProvider {
    private docs: Map<string, MemoryYDocEntry> = new Map();

    constructor() {
        super();
        this.docs = new Map<string, MemoryYDocEntry>();
    }

    private async getYDocument(id: string, socket: YSyncSocket): Promise<Y.Doc> {
        const entry = this.docs.get(id);

        if (entry) {
            if (!entry.sockets.includes(socket)) {
                entry.sockets.push(socket);
                log(`Added socket to existing document ${id}`);
            }
            return entry.doc;
        }

        return this.newYDocument(id, socket);
    }

    private async newYDocument(id: string, socket: YSyncSocket): Promise<Y.Doc> {
        const doc = new Y.Doc({ guid: id });
        await this.emitCreate(doc);
        doc.on('update', this.handleDocUpdate.bind(this));
        this.docs.set(id, { doc, sockets: [socket] });
        log(`Created new document ${id}`);
        return doc;
    }

    private handleDocUpdate(update: Uint8Array, transactionOrigin: any, doc: Y.Doc, transaction: Y.Transaction) {
        log(`Sending syncUpdate for document ${doc.guid}`);
        const entry = this.docs.get(doc.guid);
        let sockets = entry?.sockets || [];
        sockets = sockets.filter(s => s !== transactionOrigin);
        this.emit('update', doc, update, sockets, transactionOrigin);
    };

    applyUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): void {
        const entry = this.docs.get(docid);
        if (entry) {
            log(`Applying update to document ${docid}`);
            Y.applyUpdate(entry.doc, update, socket);
        } else {
            console.error(`Document ${docid} not found for applying update`);
        }
    }

    async stateVector(docid: string, socket: YSyncSocket): Promise<Uint8Array> {
        const doc = await this.getYDocument(docid, socket);
        log(`Retrieving state vector for document ${docid}`);
        return Y.encodeStateVector(doc);
    }

    stateAsUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): Uint8Array {
        const entry = this.docs.get(docid);
        if (entry) {
            log(`Retrieving state as update for document ${docid}`);
            return Y.encodeStateAsUpdate(entry.doc, update);
        } else {
            console.error(`Document ${docid} not found for retrieving state as update`);
            return new Uint8Array();
        }
    }

    disconnect(socket: YSyncSocket): void {
        for (const [id, entry] of this.docs.entries()) {
            const index = entry.sockets.indexOf(socket);
            if (index !== -1) {
                log(`Removing socket from document ${id}`);
                entry.sockets.splice(index, 1);
                if (entry.sockets.length === 0) {
                    log(`No more sockets for document ${id}, deleting document`);
                    this.docs.delete(id);
                }
            }
        }
    }
}