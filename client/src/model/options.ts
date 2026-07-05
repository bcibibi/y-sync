
export interface YSyncClientWebSocketOptions {
    autoconnect?: boolean;
    reconnectInterval?: number;
    websocket?: typeof WebSocket;
}