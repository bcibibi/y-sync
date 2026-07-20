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
            console.error(`Error handling syncStep1 for document ${docId}:`, error);
        }
    };

    const handleSyncStep2 = async (docId: string, update: Uint8Array) => {
        try {
            log(`Received syncStep2 for document ${docId}`);
            await provider.applyUpdate(docId, update, socket);
        } catch (error) {
            console.error(`Error handling syncStep2 for document ${docId}:`, error);
        }
    };

    const handleSyncUpdate = async (docId: string, update: Uint8Array) => {
        try {
            log(`Received syncUpdate for document ${docId}`);
            await provider.applyUpdate(docId, update, socket);
        } catch (error) {
            console.error(`Error handling syncUpdate for document ${docId}:`, error);
        }
    };

    const handleSyncDestroy = async (docId: string) => {
        try {
            log(`Received syncDestroy for document ${docId}`);
            await provider.remove(docId, socket);
        } catch (error) {
            console.error(`Error handling syncDestroy for document ${docId}:`, error);
        }
    };

    const handleDocUpdate = (doc: Y.Doc, update: Uint8Array, sockets: YSyncSocket[], origin: any) => {
        log(`Emitting syncUpdate for document ${doc.guid}, nomber of sockets: ${sockets.length}`);
        sockets.forEach(s => {
            s.send('syncUpdate', doc.guid, update);
        });
        onUpdate(doc, origin);
    };

    const handleDocCreate = async (doc: Y.Doc, cb: (err?: any) => void) => {
        log(`Document created with id: ${doc.guid}`);
        let err: any;
        try {
            await onCreate(doc);
        } catch (error) {
            err = error;
        } finally {
            cb(err);
        }
    }

    const handleDocDestroy = async (doc: Y.Doc) => {
        log(`Document destroyed with id: ${doc.guid}`);
        try {
            await onDestroy(doc);
        } catch (error) {
            console.error(`Error handling document destroy for document ${doc.guid}:`, error);
        }
    }

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