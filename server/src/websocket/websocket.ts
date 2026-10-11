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
        this.wss = new WebSocketServer({ noServer: true });
        this._auth = (_socket, next) => next(true);
        this.server.on('upgrade', (request, socket, head) => {
            const { pathname } = new URL(request.url ?? '', 'http://localhost');
            if (pathname === this.options.path) {
                this.wss?.handleUpgrade(request, socket, head, this.handleUpgradeCallback.bind(this));
            }
        })
    }

    private handleUpgradeCallback(ws: WebSocket, request: http.IncomingMessage) {
        try {
            log("New YSyncSocket connection established");
            const socket = new YSyncSocket(ws, request);
            this._auth(socket, (result: Error | boolean) => {
                if (result instanceof Error || result === false) {
                    const message = result instanceof Error ? result.message : 'Authentication failed';
                    console.error("Authentication failed for YSyncSocket:", message);
                    ws.close(4001, message);
                    return;
                }
                socket.on('disconnect', this.handleSocketDisconnect.bind(this));
                socket.send('connected');
                this.emit('connection', socket);
            });
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