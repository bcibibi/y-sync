import * as awarenessProtocol from 'y-protocols/awareness';
import * as Y from 'yjs';
import type { YSyncClientWebSocket } from '../websocket/websocket.js';
import debug from 'debug';

const log = debug('y-sync:client:awareness');
interface AwarenessUpdate {
    added: number[]
    updated: number[]
    removed: number[]
}

export class YSyncAwareness {
    private _awareness: awarenessProtocol.Awareness;

    get awareness() {
        return this._awareness;
    }

    constructor(private ws: YSyncClientWebSocket) {
        this._awareness = new awarenessProtocol.Awareness(new Y.Doc());
        this._awareness.setLocalState({});
        this._awareness.on('update', this.handleUpdate.bind(this));
        ws.on('connect', this.handleConnect.bind(this));
        ws.on('reconnect', this.handleConnect.bind(this));
        ws.on('syncAwareness', this.handleSyncAwareness.bind(this));
    }

    private handleConnect() {
        if (this._awareness.getLocalState() !== null) {
            log("WebSocket connected, sending local awareness state, %j", this._awareness.getLocalState());
            this.sendUpdate([this._awareness.clientID]);
        }
    }

    private getUpdate(clients: number[], state?: Map<number, any>) {
        return awarenessProtocol.encodeAwarenessUpdate(this._awareness, clients, state)
    }

    private sendUpdate(clients: number[], state?: Map<number, any>) {
        log(`Sending awareness update for clients: ${clients}, state: ${state}`);
        const update = this.getUpdate(clients, state);
        this.ws.send('syncAwareness', update);
    }

    private handleUpdate({ added, updated, removed }: AwarenessUpdate, _origin: any) {
        const changedClients = added.concat(updated).concat(removed);
        log(`Awareness update: added=${added}, updated=${updated}, removed=${removed}`);
        this.sendUpdate(changedClients);
    }

    private handleSyncAwareness(update: Uint8Array) {
        log(`Received awareness update from server`);
        awarenessProtocol.applyAwarenessUpdate(this._awareness, update, this);
    }
}
