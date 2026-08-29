import type { YSyncSocket } from "../websocket/socket.js";
import type http from "http";

export interface YSyncSocketEvents {
    disconnect: [socket: YSyncSocket];
    error: [error: Error];
    [event: string]: any[];
}

export type YSyncWebSocketEvents = {
    connection: [socket: YSyncSocket];
    disconnect: [socket: YSyncSocket];
};


export type YSyncWebSocketAuthFct<R extends http.IncomingMessage = http.IncomingMessage> = (request: R, res: any, next: (result: Error | boolean) => void) => Promise<any> | any;