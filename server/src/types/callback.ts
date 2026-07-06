import * as Y from 'yjs';

export interface YSyncCallbacks {
    onCreate: (doc: Y.Doc) => void;
    onUpdate: (doc: Y.Doc) => void;
}