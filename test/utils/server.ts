import { YSync, type YSyncOptions, type YSyncWebSocketOptions } from "y-sync";
import http from "http";

export async function createYSyncWebSocket(port: number, options?: YSyncOptions): Promise<YSync> {

    const server = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end("Hello world\n");
    });

    const ySync = new YSync(server, options);

    await new Promise<void>((resolve, reject) => {
        server.listen(port, (err?: Error) => {
            if (err) {
                reject(err);
            } else {
                console.log(`Server running at http://localhost:${port}/`);
                resolve();
            }
        });
    });

    return ySync;

}

export async function closeYSyncWebSocket(ySync: YSync): Promise<void> {
    console.log("Closing YSync WebSocket server...");
    return new Promise<void>((resolve, reject) => {
        ySync.close(err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
