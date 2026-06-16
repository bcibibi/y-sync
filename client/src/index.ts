import { YSyncClientWebSocket } from "./websocket/websocket.js";



export namespace YSyncClient {

    class YSyncClient {

        private ws: YSyncClientWebSocket;

        constructor(private url: string) { 
            this.ws = new YSyncClientWebSocket(url);
            this.ws.on('connect', () => {
                console.log("WebSocket connected");
                this.ws.send('test', { message: 'Hello from client!' });
            });
            this.ws.on('disconnect', () => {
                console.log("WebSocket disconnected");
            });
            this.ws.on('error', (error) => {
                console.error("WebSocket error:", error);
            });
            this.ws.on('testResponse', (data) => {
                console.log("Received testResponse event with data:", data);
            });
        }


        close() {
            this.ws.disconnect();
        }
    }


    export function connect(url: string) {
        const client = new YSyncClient(url);

        return client;
    }

}