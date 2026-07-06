import debug from "debug";
import EventEmitter from "events";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import type { YSyncClientOptions } from "../types/options.js";
import type { YSyncClientWebSocketEvents } from "../types/websocket.js";

const log = debug("y-sync:client:ws");

export class YSyncClientWebSocket extends EventEmitter<YSyncClientWebSocketEvents> {
    private connected: boolean = false;
    private connecting: boolean = false;
    private nbConnection: number = 0;
    private ws: WebSocket | undefined;
    private lastMessageTime: number;
    private _websocket: typeof WebSocket;
    private reconnectInterval: number;
    private reconnectTimeout?: NodeJS.Timeout | undefined;

    constructor(private url: string, {
        autoconnect = true,
        reconnectInterval = 5000,
        websocket = WebSocket
    }: YSyncClientOptions) {
        super();
        this.lastMessageTime = Date.now();
        this.reconnectInterval = reconnectInterval;
        this._websocket = websocket;
        if (autoconnect) {
            this.connect();
        }
    }

    connect() {
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
        if(!this.reconnectTimeout) {
            this.reconnectTimeout = setInterval(this.reconnect.bind(this, this.reconnectInterval), this.reconnectInterval);
        }
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
            clearInterval(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
        }
        log('WebSocket disconnected');
    }

    private reconnect(interval: number) {
        log('Checking WebSocket connection for reconnection...');
        log(`Last message time: ${this.lastMessageTime}, current time: ${Date.now()}, interval: ${interval}`);
        if (Date.now() - this.lastMessageTime > interval) {
            log('WebSocket connection lost, reconnecting...');
            this.disconnect(true);
            this.connect();
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
        log('WebSocket handleMessage');
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
        log('WebSocket handleOpen');
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
    }

    private handleClose() {
        log('WebSocket handleClose');
        this.connected = false;
        this.connecting = false;
        this.emit('disconnect');
    }

    private handleError(error: ErrorEvent) {
        log('WebSocket handleError:', error);
        this.emit('error', error);
    }
}