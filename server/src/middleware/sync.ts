import type { YSyncSocket } from "../websocket/socket.js";
import type { YSyncWebSocketOptions } from "../websocket/websocket.js";
import * as Y from 'yjs';
import debug from 'debug';

const log = debug('y-sync:server:sync');

export interface YSyncCallbacks {
    onCreate: (doc: Y.Doc) => void;
    onUpdate: (doc: Y.Doc) => void;
}

export function sync(socket: YSyncSocket, { provider }: YSyncWebSocketOptions, { onCreate, onUpdate }: YSyncCallbacks) {

    const getYDocument = (id: string) => {
        let doc = provider.getYDocument(id, socket);
        if (!doc) {
            doc = new Y.Doc({ guid: id });
            onCreate(doc);
            doc.on('update', handleDocUpdate);
            doc.on('update', () => onUpdate(doc!));
            provider.addYDocument(doc, socket);
        }
        return doc;
    };

    const handleSyncStep1 = (docId: string, update: Uint8Array) => {
        log(`Received syncStep1 for document ${docId}`);
        const doc = getYDocument(docId);
        log(`Sending syncStep1 for document ${docId}`);
        socket.send('syncStep1', docId, Y.encodeStateVector(doc));
        log(`Sending syncStep2 for document ${docId}`);
        socket.send('syncStep2', docId, Y.encodeStateAsUpdate(doc, update));
    };

    const handleSyncStep2 = (docId: string, update: Uint8Array) => {
        log(`Received syncStep2 for document ${docId}`);
        const doc = getYDocument(docId);
        Y.applyUpdate(doc, update, socket);
    };

    const handleSyncUpdate = (docId: string, update: Uint8Array) => {
        log(`Received syncUpdate for document ${docId}`);
        const doc = getYDocument(docId);
        Y.applyUpdate(doc, update, socket);
    };

    const handleDocUpdate = (update: Uint8Array, transactionOrigin: any, doc: Y.Doc, transaction: Y.Transaction) => {
        if (transactionOrigin === socket) {
            return;
        }
        log(`Sending syncUpdate for document ${doc.guid}`);
        socket.send('syncUpdate', doc.guid, update);
    };

    socket.on('syncStep1', handleSyncStep1);
    socket.on('syncStep2', handleSyncStep2);
    socket.on('syncUpdate', handleSyncUpdate);

}