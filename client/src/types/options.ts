
export interface YSyncWebSocket {
    binaryType?: string;
    onopen: ((event: any) => void) | null;
    onclose: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onmessage: ((event: any) => void) | null;
    send(data: any): void;
    close(code?: number, reason?: string): void;
}

export type YSyncWebSocketConstructor = new (
    url: string | URL,
    protocols?: string | string[],
    options?: { headers?: Record<string, string> }
) => YSyncWebSocket;

export interface YSyncClientOptions {
    autoconnect?: boolean;
    reconnectInterval?: number;
    path?: string;
    headers?: Record<string, string>;
    websocket?: YSyncWebSocketConstructor;
}