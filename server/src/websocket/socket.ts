import * as http from 'http';
import { WebSocket } from 'ws';

export class YSyncSocket {

    constructor(private ws: WebSocket, private request: http.IncomingMessage) { }
}