import { YSync } from "y-sync";
import http from "http";
import 'y-utils/override'

const port = 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("Hello world\n");
});

const ySync = new YSync(server);

let interval = null;

ySync.use((doc, action) => {
    console.log("Document action:", action);
    if (action === "create") {
        console.log('Add text')
        doc.getMap("test").set("message", "Hello from YSync!");
        console.log('Add array')
        doc.getMap("test").set("array", [1, 2, 3]);
        console.log('Add object')
        doc.getMap("test").set("object", { a: 1, b: 2, c: 3 });
        console.log('Add count')
        doc.getMap("test").set("count", 0);
        if (interval == null) {
            interval = setInterval(() => {
                doc.transact(() => {
                    const count = doc.getMap("test").getValue("count") || 0;
                    doc.getMap("test").set("count", count > 10 ? 0 : count + 1);
                    doc.getMap("test").set("array", Array.from({ length: count + 1 }, (_, i) => i));
                    doc.getMap("test").set("object", { a: count, b: count * 2, c: count * 3 });
                });
            }, 500);
        }
    }

    if (action === "delete") {
        if (interval != null) {
            clearInterval(interval);
            interval = null;
        }
    }

    if (action === "update") {
        const message = doc.getMap("test").get("message");
        const count = doc.getMap("test").get("count");
        console.log(`Document updated: message=${message}, count=${count}`);
    }
});

await new Promise((resolve, reject) => {
    server.listen(port, (err) => {
        if (err) {
            reject(err);
        } else {
            console.log(`Server running at http://localhost:${port}/`);
            resolve();
        }
    });
});
