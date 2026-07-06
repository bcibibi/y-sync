import type { YSyncSocket } from "../websocket/socket.js";
import debug from 'debug';
import type { YSyncCallbacks } from "../types/callback.js";
import type { YSyncWebSocketOptions } from "../types/options.js";

const log = debug('y-sync:server:sync');

export function sync(socket: YSyncSocket, { provider }: YSyncWebSocketOptions, callbacks: YSyncCallbacks) {

    const handleSyncStep1 = (docId: string, update: Uint8Array) => {
        log(`Received syncStep1 for document ${docId}`);
        log(`Sending syncStep1 for document ${docId}`);
        socket.send('syncStep1', docId, provider.stateVector(docId, socket, callbacks));
        log(`Sending syncStep2 for document ${docId}`);
        socket.send('syncStep2', docId, provider.stateAsUpdate(docId, update, socket));
    };

    const handleSyncStep2 = (docId: string, update: Uint8Array) => {
        log(`Received syncStep2 for document ${docId}`);
        provider.applyUpdate(docId, update, socket);
    };

    const handleSyncUpdate = (docId: string, update: Uint8Array) => {
        log(`Received syncUpdate for document ${docId}`);
        provider.applyUpdate(docId, update, socket);
    };

    const handleDocUpdate = (update: Uint8Array, docid: string) => {
        log(`Emitting syncUpdate for document ${docid}`);
        socket.send('syncUpdate', docid, update);
    };

    provider.onUpdate(socket, handleDocUpdate);
    socket.on('syncStep1', handleSyncStep1);
    socket.on('syncStep2', handleSyncStep2);
    socket.on('syncUpdate', handleSyncUpdate);

}