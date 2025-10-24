import { describe, it, expect } from "vitest";
import { callOpenAIWithRetry } from "./index";

describe("Issue #34 - OpenAI Retry", () => {
  it("retries on failure", async () => {
    let attempts = 0;
    const result = await callOpenAIWithRetry(async () => { attempts++; if (attempts < 2) throw new Error("Fail"); return "Success"; });
    expect(result).toBe("Success");
    expect(attempts).toBe(2);
  });
});
