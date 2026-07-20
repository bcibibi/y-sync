import * as Y from 'yjs';
import type { YSyncSocket } from '../websocket/socket.js';
import EventEmitter from 'events';

interface YDocProviderEvents {
    delete: [doc: Y.Doc];
    create: [doc: Y.Doc, cb: (err?: any) => void];
    update: [doc: Y.Doc, update: Uint8Array, sockets: YSyncSocket[], origin: any];
}

export type YDocProviderUpdateCallback = (update: Uint8Array, docid: string) => void;

export abstract class YDocProvider extends EventEmitter<YDocProviderEvents> {

    constructor() {
        super();
    }

    abstract disconnect(socket: YSyncSocket): void;
    abstract remove(docid: string, socket: YSyncSocket): void | Promise<void>;
    abstract applyUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): void | Promise<void>;
    abstract stateVector(docid: string, socket: YSyncSocket, meta: Record<string, any>): Uint8Array | Promise<Uint8Array>;
    abstract stateAsUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): Uint8Array | Promise<Uint8Array>;

    protected emitCreate(doc: Y.Doc) {
        return new Promise<void>((resolve, reject) => {
            this.emit('create', doc, (err?: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}