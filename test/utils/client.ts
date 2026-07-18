
import { YSyncClient, type YSyncClientOptions } from "y-sync-client";

export async function createYSyncClient(port: number, {
    onError, 
    onDisconnect
}: {
    onError?: (error: any) => void, 
    onDisconnect?: () => void
} = {}, options?: YSyncClientOptions): Promise<YSyncClient> {
    const client = new YSyncClient(`ws://localhost:${port}`, options);
    client.on('disconnect', () => {
        console.log("Client disconnected from server");
        onDisconnect?.();
    });
    client.on('error', (error) => {
        console.error("Client encountered an error:", error);
        onError?.(error);
    });
    console.log("Connecting client to server...");
    await new Promise<void>((resolve) => client.once('connect', resolve));
    return client;
}