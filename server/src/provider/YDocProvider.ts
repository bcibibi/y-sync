import * as Y from 'yjs';
import type { YSyncSocket } from '../websocket/socket.js';

export interface YDocProvider {
    addYDocument(doc: Y.Doc, socket: YSyncSocket): void;
    getYDocument(id: string, socket: YSyncSocket): Y.Doc | undefined;
    disconnect(socket: YSyncSocket): void;
}