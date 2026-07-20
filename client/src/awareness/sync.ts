import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness';
import * as Y from 'yjs';
import type { YSyncClientWebSocket } from '../websocket/websocket.js';
import debug from 'debug';
import type { AwarenessUpdate } from '../types/awareness.js';

const log = debug('y-sync:client:awareness');

export class YSyncAwareness {
    private _awareness: Awareness;

    get awareness() {
        return this._awareness;
    }

    constructor(private ws: YSyncClientWebSocket) {
        this._awareness = new Awareness(new Y.Doc());
        this._awareness.setLocalState({});
        ws.on('connect', this.handleConnect.bind(this));
        ws.on('disconnect', this.handleDisconnect.bind(this));
        ws.on('reconnect', this.handleConnect.bind(this));
        ws.on('syncAwareness', this.handleSyncAwareness.bind(this));
    }

    private handleConnect() {
        this._awareness.on('update', this.handleUpdate.bind(this));
        if (this._awareness.getLocalState() !== null) {
            log("WebSocket connected, sending local awareness state, %j", this._awareness.getLocalState());
            this.sendUpdate([this._awareness.clientID]);
        }
    }

    private handleDisconnect() {
        log("WebSocket disconnected");
        this._awareness.off('update', this.handleUpdate.bind(this));
    }

    private getUpdate(clients: number[]) {
        return encodeAwarenessUpdate(this._awareness, clients)
    }

    private sendUpdate(clients: number[]) {
        log(`Sending awareness update for clients: ${clients}`);
        const update = this.getUpdate(clients);
        this.ws.send('syncAwareness', update);
    }

    private handleUpdate({ added, updated, removed }: AwarenessUpdate, _origin: any) {
        const changedClients = added.concat(updated).concat(removed);
        log(`Awareness update: added=${added}, updated=${updated}, removed=${removed}`);
        this.sendUpdate(changedClients);
    }

    private handleSyncAwareness(update: Uint8Array) {
        log(`Received awareness update from server`);
        applyAwarenessUpdate(this._awareness, update, this);
    }
}
