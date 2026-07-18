import * as Y from 'yjs';

export interface YSyncCallbacks {
    onCreate: (doc: Y.Doc) => void | Promise<void>;
    onUpdate: (doc: Y.Doc, origin: any) => void | Promise<void>;
    onDestroy: (doc: Y.Doc) => void | Promise<void>;
}