import debug from "debug";
import EventEmitter from "events";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";

const log = debug("y-sync:client:ws");

export interface YSyncClientWebSocketOptions {
    autoconnect?: boolean;
    websocket?: typeof WebSocket;
}

interface YSyncClientWebSocketEvents {
    connect: [];
    disconnect: [];
    error: [error: Event];
    [event: string]: any[];
}

export class YSyncClientWebSocket extends EventEmitter<YSyncClientWebSocketEvents> {
    private connected: boolean = false;
    private connecting: boolean = false;
    private ws?: WebSocket;

    constructor(private url: string, private options: YSyncClientWebSocketOptions = {
        autoconnect: true,
        websocket: WebSocket
    }) {
        super();
        if (this.options?.autoconnect) {
            this.connect();
        }
    }

    connect() {
        if (this.connected || this.connecting) {
            return;
        }

        this.connecting = true;
        const WebSocketClass = this.options?.websocket || WebSocket;
        this.ws = new WebSocketClass(this.url);
        this.ws.binaryType = 'arraybuffer';
        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
    }

    disconnect() {
        if (!this.connected) {
            return;
        }
        this.ws?.close();
        this.connected = false;
        this.connecting = false;
        this.emit('disconnect');
        log('WebSocket disconnected');
    }

    send(event: string, ...args: any[]) {
        if (!this.connected) {
            throw new Error('WebSocket is not connected');
        }
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
        } else {
            log('WebSocket message received:', data);
        }
    }

    private handleOpen() {
        this.connected = true;
        this.connecting = false;
        this.emit('connect');
        log('WebSocket handleOpen');
    }

    private handleClose() {
        this.connected = false;
        this.connecting = false;
        this.emit('disconnect');
        log('WebSocket handleClose');
    }

    private handleError(error: Event) {
        this.emit('error', error);
        log('WebSocket handleError:', error);
    }
}