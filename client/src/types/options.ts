
export interface YSyncWebSocket {
    binaryType?: string;
    onopen: ((event: unknown) => void) | null;
    onclose: ((event: unknown) => void) | null;
    onerror: ((event: unknown) => void) | null;
    onmessage: ((event: { data: unknown }) => void) | null;
    send(data: unknown): void;
    close(code?: number, reason?: string): void;
}

export type YSyncWebSocketConstructor = new (url: string, protocols?: string | string[]) => YSyncWebSocket;

export interface YSyncClientOptions {
    autoconnect?: boolean;
    reconnectInterval?: number;
    websocket?: YSyncWebSocketConstructor;
}