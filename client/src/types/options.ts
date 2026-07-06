
export interface YSyncClientOptions {
    autoconnect?: boolean;
    reconnectInterval?: number;
    websocket?: typeof WebSocket;
}