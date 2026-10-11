
import { YSyncClient, type YSyncClientOptions } from "@bcibibi/y-sync-client";
import WebSocket from "ws";

export async function createYSyncClient(port: number, {
    onError, 
    onDisconnect
}: {
    onError?: (error: any) => void, 
    onDisconnect?: () => void
} = {}, options?: YSyncClientOptions): Promise<YSyncClient> {
    const client = new YSyncClient(`ws://localhost:${port}`, { ...options, websocket: WebSocket, headers: { test: "test" } });
    client.on('disconnected', () => {
        console.log("Client disconnected from server");
        onDisconnect?.();
    });
    client.on('error', (error) => {
        console.error("Client encountered an error:", error);
        onError?.(error);
    });
    console.log("Connecting client to server...");
    await new Promise<void>((resolve) => client.once('connected', resolve));
    return client;
}