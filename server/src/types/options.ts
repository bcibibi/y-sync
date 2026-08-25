import type { YDocProvider } from '../provider/YDocProvider.js';
import * as awarenessProtocol from 'y-protocols/awareness';

export interface YSyncOptions {
    provider?: YDocProvider;
    awareness?: YSyncAwarenessOptions;
    path?: string;
}

export interface YSyncWebSocketOptions {
    provider: YDocProvider;
    path: string;
}

export interface YSyncAwarenessOptions {
    awareness?: awarenessProtocol.Awareness;
    resyncInterval?: number;
}