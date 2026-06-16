import { YSyncClientWebSocket } from "./websocket/websocket.js";



export namespace YSyncClient {

    class YSyncClient {

        private ws: YSyncClientWebSocket;

        constructor(private url: string) { 
            this.ws = new YSyncClientWebSocket(url);
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