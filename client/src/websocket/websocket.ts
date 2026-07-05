import debug from "debug";
import EventEmitter from "events";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import type { YSyncClientWebSocketOptions } from "../model/options.js";

const log = debug("y-sync:client:ws");

interface YSyncClientWebSocketEvents {
    connect: [];
    reconnect: [];
    disconnect: [];
    error: [error: Event];
    [event: string]: any[];
}

export class YSyncClientWebSocket extends EventEmitter<YSyncClientWebSocketEvents> {
    private connected: boolean = false;
    private connecting: boolean = false;
    private nbConnection: number = 0;
    private ws: WebSocket | undefined;
    private lastMessageTime: number;
    private _websocket: typeof WebSocket;
    private reconnectInterval: NodeJS.Timeout;

    constructor(private url: string, {
        autoconnect = true,
        reconnectInterval = 2000,
        websocket = WebSocket
    }: YSyncClientWebSocketOptions) {
        super();
        this.lastMessageTime = Date.now();
        this._websocket = websocket;
        if (autoconnect) {
            this.connect();
        }
        this.reconnectInterval = setInterval(this.reconnect.bind(this, reconnectInterval), reconnectInterval);
    }

    connect(reconnection: boolean = false) {
        if (this.connected || this.connecting) {
            return;
        }

        this.connecting = true;
        log(`Connecting to WebSocket server at ${this.url} using ${this._websocket.name}`);
        this.ws = new this._websocket(this.url);
        this.ws.binaryType = 'arraybuffer';
        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
    }

    disconnect(reconnection: boolean = false) {
        if (!this.connected) {
            return;
        }
        this.ws?.close();
        this.ws = undefined;
        this.connected = false;
        this.connecting = false;
        if (!reconnection) {
            clearInterval(this.reconnectInterval);
        }
        log('WebSocket disconnected');
    }

    private reconnect(interval: number) {
        log('Checking WebSocket connection for reconnection...');
        log(`Last message time: ${this.lastMessageTime}, current time: ${Date.now()}, interval: ${interval}`);
        if (Date.now() - this.lastMessageTime > interval) {
            log('WebSocket connection lost, reconnecting...');
            this.disconnect(true);
            this.connect(true);
        }
    }

    send(event: string, ...args: any[]) {
        if (!this.connected) {
            return;
        }
        log('WebSocket sending message:', event, ...args);
        const encoder = encoding.createEncoder();
        encoding.writeVarString(encoder, event);
        for (const arg of args) {
            encoding.writeAny(encoder, arg);
        }
        const data = encoding.toUint8Array(encoder);
        this.ws?.send(data);
    }

    private handleMessage(event: MessageEvent) {
        let data = event.data;
        if (data instanceof ArrayBuffer) {
            const decoder = decoding.createDecoder(new Uint8Array(data));
            const event = decoding.readVarString(decoder);
            const args = [];
            while (decoding.hasContent(decoder)) {
                args.push(decoding.readAny(decoder));
            }
            log('WebSocket message received:', event, ...args);
            this.emit(event, ...args);
            this.lastMessageTime = Date.now();
        } else {
            log('WebSocket message received:', data);
        }
    }

    private handleOpen() {
        this.connected = true;
        this.connecting = false;
        this.nbConnection++;
        if (this.nbConnection > 1) {
            log('WebSocket reconnected');
            this.emit('reconnect');
        } else {
            log('WebSocket first connection established');
            this.emit('connect');
        }
        log('WebSocket handleOpen');
    }

    private handleClose() {
        this.connected = false;
        this.connecting = false;
        this.emit('disconnect');
        log('WebSocket handleClose');
    }

    private handleError(error: ErrorEvent) {
        log('WebSocket handleError:', error);
        this.emit('error', error);
    }
}