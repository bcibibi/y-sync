import http from 'http';
import { YSyncWebSocket } from './websocket/websocket.js';


export class YSync {
    
    private ws: YSyncWebSocket;

    constructor(private server: http.Server) { 
        this.ws = new YSyncWebSocket(server);
        this.ws.on('connection', (socket) => {
            console.log("New YSyncSocket connection established");
            socket.on('test', (data) => {
                console.log("Received test event with data of type", typeof data, ":", data);
                socket.send('testResponse', { message: 'Hello from server!' });
            });
        });
    }


    close(cb?: (err?: Error) => void) {
        this.ws.close(cb);
    }
}