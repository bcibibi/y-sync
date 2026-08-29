import * as Y from 'yjs';

export interface YSyncCallbacks {
    onCreate: (doc: Y.Doc, error: (err: any) => void) => void | Promise<void>;
    onUpdate: (doc: Y.Doc, origin: any, error: (err: any) => void) => void | Promise<void>;
    onDestroy: (doc: Y.Doc, error: (err: any) => void) => void | Promise<void>;
}