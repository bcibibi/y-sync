import debug from "debug";

const log = debug("y-sync:client:ws");

export interface YSyncClientWebSocketOptions {
    autoconnect?: boolean;
    websocket?: typeof WebSocket;
}

export class YSyncClientWebSocket {
    private connected: boolean = false;
    private connecting: boolean = false;
    private ws?: WebSocket;

    constructor(private url: string, private options: YSyncClientWebSocketOptions = {
        autoconnect: true,
        websocket: WebSocket
    }) {
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
        log('WebSocket disconnected');
    }

    send(data: string | ArrayBuffer | Blob) {
        if (!this.connected) {
            throw new Error('WebSocket is not connected');
        }
        this.ws?.send(data);
    }

    private handleMessage(event: MessageEvent) {
        console.log('WebSocket message received:', event.data);
    }

    private handleOpen() {
        this.connected = true;
        this.connecting = false;
        log('WebSocket handleOpen');
    }

    private handleClose() {
        this.connected = false;
        this.connecting = false;
        log('WebSocket handleClose');
    }

    private handleError(error: Event) {
        log('WebSocket handleError:', error);
    }
}