import { YSyncServer, type YSyncOptions, type YSyncWebSocketOptions } from "@bcibibi/y-sync-server";
import http from "http";

export type TestServer = { server: http.Server, ysync: YSyncServer };

export async function createYSyncWebSocket(port: number, options?: YSyncOptions): Promise<TestServer> {

    const server = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end("Hello world\n");
    });

    const ysync = new YSyncServer(server, options);

    await new Promise<void>((resolve, reject) => {
        server.listen(port, (err?: Error) => {
            if (err) {
                reject(err);
            } else {
                console.log(`Server running at http://localhost:${port}/ysync`);
                resolve();
            }
        });
    });

    return { server, ysync };

}

export async function closeYSyncWebSocket({ server, ysync }: TestServer): Promise<void> {
    console.log("Closing YSync WebSocket server...");
    return new Promise<void>((resolve, reject) => {
        ysync.close(err => {
            if (err) {
                reject(err);
            } else {
                server.close(err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    });
}
