

export interface YSyncClientWebSocketEvents {
    connect: [];
    reconnect: [];
    disconnect: [];
    error: [error: unknown];
    [event: string]: any[];
}