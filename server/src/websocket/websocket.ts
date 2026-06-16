import * as http from 'http';
import { WebSocketServer } from 'ws';
import { YSyncSocket } from './socket.js';
import EventEmitter from 'events';
import debug from 'debug';

const log = debug('y-sync:server:ws');

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
                    log("New YSyncSocket connection established");
                    this.emit('connection', socket);
                    ws.on('close', () => {
                        log("YSyncSocket connection closed");
                    });
                } catch (error) {
                    console.error("Failed to create YSyncSocket:", error);
                    ws.close();
                }
            })
        })
    }

    close(cb?: (err?: Error) => void) {
        this.wss.close(cb);
    }

}