import type { YSyncSocket } from "../websocket/socket.js";
import debug from 'debug';
import type { YSyncCallbacks } from "../types/callback.js";
import type { YSyncWebSocketOptions } from "../types/options.js";
import * as Y from 'yjs';

const log = debug('y-sync:server:sync');

export function sync(socket: YSyncSocket, { provider }: YSyncWebSocketOptions, { onCreate, onUpdate, onDestroy }: YSyncCallbacks) {

    const handleSyncStep1 = async (docId: string, update: Uint8Array, meta: string) => {
        try {
            log(`Received syncStep1 for document ${docId}`);
            log(`Sending syncStep1 for document ${docId}`);
            socket.send('syncStep1', docId, await provider.stateVector(docId, socket, JSON.parse(meta)));
            log(`Sending syncStep2 for document ${docId}`);
            socket.send('syncStep2', docId, await provider.stateAsUpdate(docId, update, socket));
        } catch (error) {
            handleError(docId, 'Error handling syncStep1', error, [socket]);
            socket.send('syncStep1:error', docId, error instanceof Error ? error.message : String(error));
        }
    };

    const handleSyncStep2 = async (docId: string, update: Uint8Array) => {
        try {
            log(`Received syncStep2 for document ${docId}`);
            await provider.applyUpdate(docId, update, socket);
        } catch (error) {
            handleError(docId, 'Error handling syncStep2', error, [socket]);
        }
    };

    const handleSyncUpdate = async (docId: string, update: Uint8Array) => {
        try {
            log(`Received syncUpdate for document ${docId}`);
            await provider.applyUpdate(docId, update, socket);
        } catch (error) {
            handleError(docId, 'Error handling syncUpdate', error, [socket]);
        }
    };

    const handleSyncDestroy = async (docId: string) => {
        try {
            log(`Received syncDestroy for document ${docId}`);
            await provider.remove(docId, socket);
        } catch (error) {
            handleError(docId, 'Error handling syncDestroy', error, [socket]);
        }
    };

    const handleDocUpdate = async (doc: Y.Doc, update: Uint8Array, sockets: YSyncSocket[], origin: any) => {
        log(`Emitting syncUpdate for document ${doc.guid}, number of sockets: ${sockets.length}`);
        try {
            sockets.forEach(s => {
                s.send('syncUpdate', doc.guid, update);
            });
            await onUpdate(doc, origin, err => handleError(doc.guid, 'Error handling document update', err, sockets));
        } catch (error) {
            handleError(doc.guid, 'Error handling document update', error, [...sockets, socket]);
        }
    };

    const handleDocCreate = async (doc: Y.Doc, cb: (err?: any) => void) => {
        log(`Document created with id: ${doc.guid}`);
        let err: any;
        try {
            await onCreate(doc, err => handleError(doc.guid, 'Error handling document create', err, [socket]));
        } catch (error) {
            err = error;
        } finally {
            cb(err);
        }
    };

    const handleDocDestroy = async (doc: Y.Doc, sockets: YSyncSocket[]) => {
        log(`Document destroyed with id: ${doc.guid}`);
        try {
            await onDestroy(doc, err => handleError(doc.guid, 'Error handling document destroy', err, sockets));
        } catch (error) {
            handleError(doc.guid, 'Error handling document destroy', error, sockets);
        }
    };

    const handleError = (docid: string, message: string, err: any, sockets: YSyncSocket[]) => {
        console.error('Sync error in document', docid, ':', message, err);
        log('Send error to sockets:', sockets.map(s => s.id));
        sockets.forEach(socket => socket.error('doc ' + docid + ': ' + message, err));
    };

    log(`Setting up event listeners for socket ${socket.id}`);
    provider.on('delete', handleDocDestroy);
    provider.on('create', handleDocCreate);
    provider.on('update', handleDocUpdate);
    socket.on('syncStep1', handleSyncStep1);
    socket.on('syncStep2', handleSyncStep2);
    socket.on('syncUpdate', handleSyncUpdate);
    socket.on('syncDestroy', handleSyncDestroy);
    socket.on('disconnect', () => {
        log(`Socket disconnected: ${socket.id}`);
        provider.disconnect(socket);
        provider.off('delete', handleDocDestroy);
        provider.off('create', handleDocCreate);
        provider.off('update', handleDocUpdate);
    });

}