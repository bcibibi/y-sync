import * as Y from 'yjs';
import type { YSyncSocket } from '../websocket/socket.js';
import EventEmitter from 'events';
import type { YSyncCallbacks } from '../model/callback.js';

interface YDocProviderEvents {
    create: [doc: Y.Doc, socket: YSyncSocket];
    update: [doc: Y.Doc, socket: YSyncSocket];
}

export type YDocProviderUpdateCallback = (update: Uint8Array, docid: string) => void;

export abstract class YDocProvider extends EventEmitter<YDocProviderEvents> {

    private updateCallbacks: Map<YSyncSocket, YDocProviderUpdateCallback> = new Map();

    constructor() {
        super();
    }

    abstract disconnect(socket: YSyncSocket): void;
    abstract applyUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): void;
    abstract stateVector(docid: string, socket: YSyncSocket, calllbacks: YSyncCallbacks): Uint8Array;
    abstract stateAsUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): Uint8Array;

    onUpdate(socket: YSyncSocket, cb: YDocProviderUpdateCallback) {
        this.updateCallbacks.set(socket, cb);
    };

    protected emitUpdate(transactionOrigin: any, update: Uint8Array, docid: string) {
        for (const [socket, cb] of this.updateCallbacks.entries()) {
            if (socket !== transactionOrigin) {
                cb(update, docid);
            }
        }
    }
}