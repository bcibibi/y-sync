import { beforeAll, test, afterAll, expect } from "@jest/globals";
import { YSync } from "y-sync";

test("test", () => {
    const test = YSync.test;
    console.log("test", test);
    expect(test).toBe("true test");
});