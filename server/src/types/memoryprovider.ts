import * as Y from 'yjs';
import type { YSyncSocket } from "../websocket/socket.js";

export interface MemoryYDocEntry {
    doc: Y.Doc;
    sockets: YSyncSocket[];
}