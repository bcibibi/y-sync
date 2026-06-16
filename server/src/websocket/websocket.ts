import * as http from 'http';
import { WebSocketServer } from 'ws';
import { YSyncSocket } from './socket.js';
import EventEmitter from 'events';


type YSyncWebSocketEvents = {
    connection: [socket: YSyncSocket];
};

export class YSyncWebSocket extends EventEmitter<YSyncWebSocketEvents> {

    private wss: WebSocketServer;

    constructor(private server: http.Server) {
        super();
        this.wss = new WebSocketServer({ noServer: true });
        this.server.on('upgrade', (request, socket, head) => {
            this.wss?.handleUpgrade(request, socket, head, ws => {
                try {
                    const socket = new YSyncSocket(ws, request);
                    this.emit('connection', socket);
                } catch (error) {
                    console.error("Failed to create YSyncSocket:", error);
                    ws.close();
                }
            })
        })
    }

}