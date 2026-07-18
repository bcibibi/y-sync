import type { YSyncSocket } from "../websocket/socket.js";

export interface YSyncSocketEvents {
    disconnect: [socket: YSyncSocket];
    error: [error: Error];
    [event: string]: any[];
}

export type YSyncWebSocketEvents = {
    connection: [socket: YSyncSocket];
    disconnect: [socket: YSyncSocket];
};
