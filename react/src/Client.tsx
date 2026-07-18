import { useY, useYDocument } from "./app";

interface MapTest {
    test: string;
    array: number[];
    object: { a: number, b: number, c: number };
    count: number;
}

export function Client() {
    const doc = useYDocument("test");
    const value = useY(doc?.getMap<MapTest>("test"), "count", { deep: true });
    const numb = useY(doc?.getMap<MapTest>("test")?.get("array"), 1, { deep: true });
    const object = useY(doc?.getMap<MapTest>("test"), "object", { deep: true });

    return (
        <div>
            <p>Count: {value}</p>
            <p>Array Number: {numb}</p>
            <p>Object: <pre>{JSON.stringify(object, null, 2)}</pre></p>
            <pre>
                {doc ? JSON.stringify(doc.getMap('test').toJSON(), null, 2) : "Loading..."}
            </pre>
        </div>
    )
}