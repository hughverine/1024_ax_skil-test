import { describe, it, expect } from "vitest";
import { setupTests, runTests } from "./index";

describe("Issue #36 - Testing Framework", () => {
  it("sets up tests", () => {
    const result = setupTests();
    expect(result.vitest).toBe(true);
  });

  it("runs unit tests", () => {
    const result = runTests("unit");
    expect(result.status).toBe("passed");
  });

  it("runs integration tests", () => {
    const result = runTests("integration");
    expect(result.status).toBe("passed");
  });

  it("runs e2e tests", () => {
    const result = runTests("e2e");
    expect(result.status).toBe("passed");
  });
});
