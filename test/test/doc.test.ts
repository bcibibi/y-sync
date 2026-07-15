import { beforeAll, test, afterAll, expect } from "@jest/globals";
import * as Y from "yjs";
import 'y-utils/override';

interface TestMap {
    testKey: string;
    lastUpdate?: Date;
}

test("init", () => {
    const doc = new Y.Doc();
    const map = doc.getMap<TestMap>("testMap");
    expect(map.get("lastUpdate")).toBeUndefined();
    expect(map.getValue("lastUpdate")).toBeUndefined();

    map.set("testKey", "testValue");
    expect(map.get("testKey")).toBeInstanceOf(Y.Text);
    expect(map.getValue("testKey")).toBe("testValue");
    map.set("testKey", "testValue2");
    expect(map.getValue("testKey")).toBe("testValue2");

})