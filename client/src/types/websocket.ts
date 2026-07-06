

export interface YSyncClientWebSocketEvents {
    connect: [];
    reconnect: [];
    disconnect: [];
    error: [error: Event];
    [event: string]: any[];
}