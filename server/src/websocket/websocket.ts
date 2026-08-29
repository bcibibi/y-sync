import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { YSyncSocket } from './socket.js';
import EventEmitter from 'events';
import debug from 'debug';
import type { YSyncWebSocketAuthFct, YSyncWebSocketEvents } from '../types/websocket.js';
import type { YSyncWebSocketOptions } from '../types/options.js';

const log = debug('y-sync:server:ws');

export class YSyncWebSocket extends EventEmitter<YSyncWebSocketEvents> {

    private wss: WebSocketServer;
    private _auth: YSyncWebSocketAuthFct;

    constructor(private server: http.Server, private options: YSyncWebSocketOptions) {
        super();
        this.wss = new WebSocketServer({ noServer: true, path: options.path });
        this._auth = (_req, _res, next) => next(true);
        this.server.on('upgrade', (request, socket, head) => {
            this._auth(request, null, (result: Error | boolean) => {
                if (result instanceof Error || result === false) {
                    socket.destroy();
                    return;
                }
                this.wss?.handleUpgrade(request, socket, head, this.handleUpgradeCallback.bind(this));
            });
        })
    }

    private handleUpgradeCallback(ws: WebSocket, request: http.IncomingMessage) {
        try {
            log("New YSyncSocket connection established");
            const socket = new YSyncSocket(ws, request);
            socket.on('disconnect', this.handleSocketDisconnect.bind(this));
            this.emit('connection', socket);
        } catch (error) {
            console.error("Failed to create YSyncSocket:", error);
            ws.close();
        }
    }

    private handleSocketDisconnect(socket: YSyncSocket) {
        log("YSyncSocket disconnected");
        this.emit('disconnect', socket);
    }

    auth(authFct: YSyncWebSocketAuthFct) {
        this._auth = authFct;
    }

    use(cb: (socket: YSyncSocket, options: YSyncWebSocketOptions) => void) {
        this.on('connection', (socket) => cb(socket, this.options));
    }

    close(cb?: (err?: Error) => void) {
        this.wss.close(cb);
    }

}