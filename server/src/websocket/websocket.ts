import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { YSyncSocket } from './socket.js';
import EventEmitter from 'events';
import debug from 'debug';
import type { YDocProvider } from '../provider/YDocProvider.js';

const log = debug('y-sync:server:ws');

type YSyncWebSocketEvents = {
    connection: [socket: YSyncSocket];
};


export interface YSyncWebSocketOptions {
    provider: YDocProvider;
}

export class YSyncWebSocket extends EventEmitter<YSyncWebSocketEvents> {

    private wss: WebSocketServer;

    constructor(private server: http.Server, private options: YSyncWebSocketOptions) {
        super();
        this.wss = new WebSocketServer({ noServer: true });
        this.server.on('upgrade', (request, socket, head) => {
            this.wss?.handleUpgrade(request, socket, head, this.handleUpgradeCallback.bind(this));
        })
    }

    private handleUpgradeCallback(ws: WebSocket, request: http.IncomingMessage) {
        try {
            const socket = new YSyncSocket(ws, request);
            log("New YSyncSocket connection established");
            socket.on('disconnect', this.handleSocketDisconnect.bind(this));
            this.emit('connection', socket);
            ws.on('close', () => {
                log("YSyncWebSocket connection closed");
            });
        } catch (error) {
            console.error("Failed to create YSyncSocket:", error);
            ws.close();
        }
    }

    private handleSocketDisconnect(socket: YSyncSocket) {
        log("YSyncSocket disconnected");
        this.options.provider.disconnect(socket);
    }

    use(cb: (socket: YSyncSocket, options: YSyncWebSocketOptions) => void) {
        this.on('connection', (socket) => cb(socket, this.options));
    }

    close(cb?: (err?: Error) => void) {
        this.wss.close(cb);
    }

}