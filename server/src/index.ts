import http from 'http';
import { YSyncWebSocket } from './websocket/websocket.js';


export class YSync {
    
    private ws: YSyncWebSocket;

    constructor(private server: http.Server) { 
        this.ws = new YSyncWebSocket(server);
    }


    close(cb?: (err?: Error) => void) {
        this.ws.close(cb);
    }
}