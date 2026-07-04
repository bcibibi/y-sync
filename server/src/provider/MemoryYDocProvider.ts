import type { YSyncSocket } from "../websocket/socket.js";
import type { YDocProvider } from "./YDocProvider.js";
import * as Y from 'yjs';
import debug from 'debug';

const log = debug('y-sync:server:memory-provider');

export class MemoryYDocProvider implements YDocProvider {
    private docs: Map<string, { doc: Y.Doc, sockets: YSyncSocket[] }> = new Map();

    constructor() {
        this.docs = new Map<string, { doc: Y.Doc, sockets: YSyncSocket[] }>();
    }

    addYDocument(doc: Y.Doc, socket: YSyncSocket): void {
        log(`Adding document ${doc.guid} for socket`);
        this.docs.set(doc.guid, { doc, sockets: [socket] });
    }

    getYDocument(id: string, socket: YSyncSocket): Y.Doc | undefined {
        const entry = this.docs.get(id);
        if (entry) {
            if (!entry.sockets.includes(socket)) {
                log(`Adding socket to document ${id}`);
                entry.sockets.push(socket);
            }
            log(`Retrieving document ${id} for socket`);
            return entry.doc;
        }
        return undefined;
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