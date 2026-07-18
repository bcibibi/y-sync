import { beforeAll, test, afterAll, expect } from "@jest/globals";
import * as Y from "yjs";
import 'y-utils/override';

interface TestMap {
    testKey: string;
    lastUpdate?: Date;
    objectKey?: {
        subKey: string;
    }
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
    map.set("lastUpdate", new Date("2024-01-01T00:00:00Z"));
    expect(map.get("lastUpdate")).toBeInstanceOf(Y.Text);
    expect(map.getValue("lastUpdate")).toBeInstanceOf(Date);
    expect(map.getValue("lastUpdate")?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    map.set("objectKey", { subKey: "subValue" });
    expect(map.get("objectKey")).toBeInstanceOf(Y.Map);
    expect(map.getValue("objectKey")).toEqual({ subKey: "subValue" });
    map.setObject({ testKey: "newValue", lastUpdate: new Date("2024-02-01T00:00:00Z"), objectKey: { subKey: "newSubValue" } });
    expect(map.getValue("testKey")).toBe("newValue");
    expect(map.getValue("lastUpdate")?.toISOString()).toBe("2024-02-01T00:00:00.000Z");
    expect(map.getValue("objectKey")).toEqual({ subKey: "newSubValue" });


})