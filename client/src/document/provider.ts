import * as Y from 'yjs';


export class YDocumentProvider {

    private documents: Map<string, Y.Doc> = new Map();

    constructor() {}

    forEach(callback: (doc: Y.Doc) => void) {
        this.documents.forEach(callback);
    }

    getYDocument(id: string): Y.Doc | undefined {
        return this.documents.get(id);
    }

    addYDocument(doc: Y.Doc) {
        this.documents.set(doc.guid, doc);
    }

    removeYDocument(id: string) {
        this.documents.delete(id);
    }

}