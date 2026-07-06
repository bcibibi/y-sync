import { YSyncSocket } from "../websocket/socket.js";
import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';
import * as Y from 'yjs';
import debug from 'debug';
import type { YSyncAwarenessOptions } from "../types/options.js";
import type { YSyncAwarenessUpdate } from "../types/awareness.js";

const log = debug('y-sync:server:awareness');

export class YSyncAwareness {
    private _awareness: Awareness;
    private sockets: Map<number, YSyncSocket> = new Map();
    private interval: NodeJS.Timeout;

    get awareness() {
        return this._awareness;
    }

    constructor(options?: YSyncAwarenessOptions) {
        this._awareness = options?.awareness ?? new Awareness(new Y.Doc());
        this._awareness.setLocalState(null);
        this._awareness.on('update', this.handleAwarenessUpdate.bind(this));
        this.interval = setInterval(this.resyncAwareness.bind(this), options?.resyncInterval ?? 3000);
    }

    middleware(socket: YSyncSocket) {
        socket.on('syncAwareness', this.handleAwarenessSync(socket));
        socket.on('disconnect', this.handleDisconnect.bind(this));
        if (this._awareness.getStates().size > 0) {
           this.sendAwarenessUpdate(socket);
        }
    }

    private resyncAwareness() {
        this.sockets.values().forEach(this.sendAwarenessUpdate.bind(this));
    }

    private sendAwarenessUpdate(socket: YSyncSocket) {
        socket.send('syncAwareness', encodeAwarenessUpdate(this._awareness, Array.from(this._awareness.getStates().keys())));
    }

    private handleDisconnect(socket: YSyncSocket) {
        const clientId = this.sockets.entries().find(([id, s]) => s === socket)?.[0];
        if (clientId !== undefined) {
            log(`Client disconnected: ${clientId}`);
            removeAwarenessStates(this._awareness, [clientId], socket);
            this._awareness.meta.delete(clientId);
        }
    }

    private handleAwarenessUpdate = ({ added, updated, removed }: YSyncAwarenessUpdate, origin: any) => {
        log(`Awareness change: added=${added}, updated=${updated}, removed=${removed}, origin=${origin instanceof YSyncSocket ? origin.id : 'unknown'}`);
        if (origin instanceof YSyncSocket) {
            added.forEach(clientID => {
                log(`Client ${clientID} added with socket ${origin.id}`);
                this.sockets.set(clientID, origin);
            });
            removed.forEach(clientID => {
                log(`Client ${clientID} removed from socket ${origin.id}`);
                this.sockets.delete(clientID);
            });
        }
        log(`Send to current awareness states: ${Array.from(this._awareness.states.keys()).join(', ')}`);
        const changedClients = added.concat(updated).concat(removed);
        const update = encodeAwarenessUpdate(this._awareness, changedClients);
        this.sockets.values().forEach(socket => socket.send('syncAwareness', update));
    };

    private handleAwarenessSync(socket: YSyncSocket) {
        return (update: Uint8Array) => {
            log(`Received awareness update from socket ${socket.id}, size: ${update.byteLength} bytes, applying to awareness ${this._awareness.clientID}`);
            applyAwarenessUpdate(this._awareness, update, socket);
            log(`Awareness states after updates: ${Array.from(this._awareness.states.keys()).join(', ')}`);
            log('Awareness metadata after updates:', this._awareness.meta);
        }
    }

    close() {
        clearInterval(this.interval);
    }
}
