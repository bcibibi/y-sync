

export interface YSyncClientWebSocketEvents {
    connected: [];
    disconnected: [];
    error: [error: unknown];
    [event: string]: any[];
}