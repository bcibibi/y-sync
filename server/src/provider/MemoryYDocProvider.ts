import type { YSyncSocket } from "../websocket/socket.js";
import { YDocProvider } from "./YDocProvider.js";
import * as Y from 'yjs';
import debug from 'debug';
import type { YSyncCallbacks } from "../model/callback.js";

const log = debug('y-sync:server:memory-provider');

export class MemoryYDocProvider extends YDocProvider {
    private docs: Map<string, { doc: Y.Doc, sockets: YSyncSocket[] }> = new Map();

    constructor() {
        super();
        this.docs = new Map<string, { doc: Y.Doc, sockets: YSyncSocket[] }>();
    }

    private getYDocument(id: string, socket: YSyncSocket, { onCreate, onUpdate }: YSyncCallbacks): Y.Doc {
        let entry = this.docs.get(id);
        if (!entry) {
            const doc = new Y.Doc({ guid: id });
            onCreate(doc);
            doc.on('update', () => onUpdate(doc));
            doc.on('update', this.handleDocUpdate.bind(this));
            entry = { doc, sockets: [socket] };
            this.docs.set(id, entry);
            log(`Created new document ${id}`);
        } else {
            if (!entry.sockets.includes(socket)) {
                entry.sockets.push(socket);
                log(`Added socket to existing document ${id}`);
            }
        }
        return entry.doc;
    }

    private handleDocUpdate(update: Uint8Array, transactionOrigin: any, doc: Y.Doc, transaction: Y.Transaction) {
        log(`Sending syncUpdate for document ${doc.guid}`);
        this.emitUpdate(transactionOrigin, update, doc.guid);
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

    stateVector(docid: string, socket: YSyncSocket, callbacks: YSyncCallbacks): Uint8Array {
        const doc = this.getYDocument(docid, socket, callbacks);
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