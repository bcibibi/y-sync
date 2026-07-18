import debug from "debug";
import { EventEmitter } from "eventemitter3";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import type { YSyncClientOptions, YSyncWebSocketConstructor } from "../types/options.js";
import type { YSyncClientWebSocketEvents } from "../types/websocket.js";

const log = debug("y-sync:client:ws");

export class YSyncClientWebSocket extends EventEmitter<YSyncClientWebSocketEvents> {
    private _id: string = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    private connected: boolean = false;
    private connecting: boolean = false;
    private nbConnection: number = 0;
    private ws: InstanceType<YSyncWebSocketConstructor> | undefined;
    private lastMessageTime: number;
    private _websocket: YSyncWebSocketConstructor;
    private reconnectInterval: number;
    private execReconnect = false;

    get id(): string {
        return this._id;
    }

    constructor(private url: string, {
        autoconnect = true,
        reconnectInterval = 5000,
        websocket
    }: YSyncClientOptions) {
        super();
        this.lastMessageTime = Date.now();
        this.reconnectInterval = reconnectInterval;
        this._websocket = websocket ?? YSyncClientWebSocket.resolveGlobalWebSocket();
        if (autoconnect) {
            this.connect();
        }
    }

    private static resolveGlobalWebSocket(): YSyncWebSocketConstructor {
        const globalWebSocket = (globalThis as { WebSocket?: YSyncWebSocketConstructor }).WebSocket;
        if (!globalWebSocket) {
            throw new Error("No WebSocket implementation found. Pass one using options.websocket in Node environments.");
        }
        return globalWebSocket;
    }

    connect() {
        if (this.connected || this.connecting) {
            return;
        }

        this.connecting = true;
        log(`Connecting to WebSocket server at ${this.url} using ${this._websocket.name}, id ${this._id}`);
        const url = this.buildUrlWithParams(this.url, { id: this._id });
        this.ws = new this._websocket(url);
        this.ws.binaryType = 'arraybuffer';
        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
        this.execReconnect = true;
        this.reconnect();
    }

    disconnect() {
        this.execReconnect = false;
        if (!this.connected && !this.connecting) {
            return;
        }
        log(`Disconnecting WebSocket ${this._id}`);
        this.ws?.close();
        this.ws = undefined;
        log('WebSocket disconnected');
    }

    private buildUrlWithParams(url: string, params: Record<string, string>): string {
        const urlObj = new URL(url);
        for (const [key, value] of Object.entries(params)) {
            urlObj.searchParams.append(key, value);
        }
        return urlObj.toString();
    }

    private reconnect() {
        setTimeout(() => {
            if (!this.execReconnect) {
                return;
            }
            log('Checking WebSocket connection for reconnection...');
            log(`Last message time: ${this.lastMessageTime}, current time: ${Date.now()}, interval: ${this.reconnectInterval}`);
            if (Date.now() - this.lastMessageTime > this.reconnectInterval) {
                log(`WebSocket ${this._id} connection lost, reconnecting...`);
                this.disconnect();
                this.connect();
            } else {
                this.reconnect();
            }
        }, this.reconnectInterval);
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

    private handleMessage(event: { data: unknown }) {
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

    private handleClose(event: any) {
        log('WebSocket handleClose:', event);
        this.connected = false;
        this.connecting = false;
        this.emit('disconnect');
    }

    private handleError(error: unknown) {
        log('WebSocket handleError:', error);
        this.emit('error', error);
    }
}