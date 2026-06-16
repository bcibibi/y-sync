import { YDocumentProvider } from "./document/provider.js";
import { YSyncDocument } from "./document/sync.js";
import { YSyncClientWebSocket } from "./websocket/websocket.js";
import * as Y from "yjs";


export namespace YSyncClient {

    class YSyncClient {

        private ws: YSyncClientWebSocket;
        private provider: YDocumentProvider;
        private syncDocument: YSyncDocument;

        constructor(private url: string) { 
            this.provider = new YDocumentProvider();
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
            this.syncDocument = new YSyncDocument(this.ws, this.provider);
        }


        async getYDocument(id: string) {
            let doc = this.provider.getYDocument(id);
            if (doc) {
                return doc;
            }
            doc = await new Promise<Y.Doc>((resolve, reject) => {
                this.syncDocument.sync(new Y.Doc({ guid: id }), resolve);
            });
            return doc;
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