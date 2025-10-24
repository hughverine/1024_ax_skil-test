import { describe, it, expect, beforeAll } from "vitest";
import {
  encryptPII,
  decryptPII,
  hashPII,
  startTest,
  getNextQuestion,
  submitAnswer,
  completeMainTest,
  getReport,
  createAuditLog,
} from "./index";
import { randomBytes } from "crypto";

// Generate test encryption key (32 bytes for AES-256)
const TEST_KEY = randomBytes(32).toString("base64");

describe("PII Encryption", () => {
  beforeAll(() => {
    // Set test encryption key
    process.env.PII_ENC_KEY = TEST_KEY;
  });

  describe("encryptPII", () => {
    it("should encrypt plaintext and return base64", () => {
      const plaintext = "john.doe@example.com";
      const encrypted = encryptPII(plaintext);

      expect(typeof encrypted).toBe("string");
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("should produce different ciphertexts for same plaintext (random IV)", () => {
      const plaintext = "sensitive-data";
      const encrypted1 = encryptPII(plaintext);
      const encrypted2 = encryptPII(plaintext);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
    });

    it("should throw error if key not configured", () => {
      const originalKey = process.env.PII_ENC_KEY;
      delete process.env.PII_ENC_KEY;

      expect(() => encryptPII("test")).toThrow("PII encryption key not configured");

      process.env.PII_ENC_KEY = originalKey;
    });
  });

  describe("decryptPII", () => {
    it("should decrypt encrypted data correctly", () => {
      const plaintext = "john.doe@example.com";
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle Unicode characters", () => {
      const plaintext = "日本語テキスト 🔒";
      const encrypted = encryptPII(plaintext);
      const decrypted = decryptPII(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw error with invalid ciphertext", () => {
      expect(() => decryptPII("invalid-base64!!!")).toThrow();
    });
  });

  describe("hashPII", () => {
    it("should generate SHA-256 hash", () => {
      const pii = "john.doe@example.com";
      const hash = hashPII(pii);

      expect(hash.length).toBe(64); // SHA-256 = 64 hex chars
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it("should be deterministic (same input = same hash)", () => {
      const pii = "test@example.com";
      const hash1 = hashPII(pii);
      const hash2 = hashPII(pii);

      expect(hash1).toBe(hash2);
    });

    it("should be different for different inputs", () => {
      const hash1 = hashPII("user1@example.com");
      const hash2 = hashPII("user2@example.com");

      expect(hash1).not.toBe(hash2);
    });
  });
});

describe("API Endpoints", () => {
  beforeAll(() => {
    process.env.PII_ENC_KEY = TEST_KEY;
  });

  describe("startTest", () => {
    it("should create session with encrypted PII", () => {
      const result = startTest({
        name: "John Doe",
        email: "john@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.data?.sessionId).toBeDefined();
      expect(result.data?.sessionId).toMatch(/^sess_/);
      expect(result.data?.token).toBeDefined();
    });

    it("should return error if name missing", () => {
      const result = startTest({
        name: "",
        email: "john@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_REQUEST");
    });

    it("should return error if email missing", () => {
      const result = startTest({
        name: "John Doe",
        email: "",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_REQUEST");
    });
  });

  describe("getNextQuestion", () => {
    it("should return next question", () => {
      const result = getNextQuestion("sess_12345", "token_12345");

      expect(result.success).toBe(true);
      expect(result.data?.questionId).toBeDefined();
      expect(result.data?.question).toBeDefined();
    });
  });

  describe("submitAnswer", () => {
    it("should return score for submitted answer", () => {
      const result = submitAnswer("sess_12345", "q_12345", ["a"], "token_12345");

      expect(result.success).toBe(true);
      expect(result.data?.score).toBeDefined();
      expect(typeof result.data?.score).toBe("number");
    });
  });

  describe("completeMainTest", () => {
    it("should check if followup needed", () => {
      const result = completeMainTest("sess_12345", "token_12345");

      expect(result.success).toBe(true);
      expect(result.data?.needsFollowup).toBeDefined();
      expect(typeof result.data?.needsFollowup).toBe("boolean");
    });
  });

  describe("getReport", () => {
    it("should return report URL with expiration", () => {
      const result = getReport("sess_12345", "token_12345");

      expect(result.success).toBe(true);
      expect(result.data?.reportUrl).toBeDefined();
      expect(result.data?.expiresAt).toBeDefined();
      expect(result.data?.expiresAt).toBeInstanceOf(Date);
    });

    it("should generate signed URL", () => {
      const result = getReport("sess_12345", "token_12345");

      expect(result.data?.reportUrl).toMatch(/\/api\/reports\/sess_12345\?sig=/);
    });
  });
});

describe("Audit Logging", () => {
  it("should create audit log with hashed userId", () => {
    const log = createAuditLog("test.action", {
      userId: "user@example.com",
      sessionId: "sess_12345",
      responseStatus: 200,
    });

    expect(log.id).toMatch(/^audit_/);
    expect(log.timestamp).toBeInstanceOf(Date);
    expect(log.action).toBe("test.action");
    expect(log.sessionId).toBe("sess_12345");
    expect(log.responseStatus).toBe(200);

    // userId should be hashed, not encrypted
    expect(log.userId).toBeDefined();
    expect(log.userId).not.toBe("user@example.com");
    expect(log.userId?.length).toBe(64); // SHA-256 hash
  });

  it("should mask IP address", () => {
    const log = createAuditLog("test.action", {
      ipAddress: "192.168.1.100",
      responseStatus: 200,
    });

    expect(log.ipAddress).toBe("192.168.xxx.xxx");
  });

  it("should mask PII in request data", () => {
    const log = createAuditLog("test.action", {
      requestData: {
        email: "john@example.com",
        name: "John Doe",
        age: 30,
      },
      responseStatus: 200,
    });

    expect(log.requestData?.email).toBe("***MASKED***");
    expect(log.requestData?.name).toBe("***MASKED***");
    expect(log.requestData?.age).toBe(30); // Non-PII should not be masked
  });

  it("should handle nested PII masking", () => {
    const log = createAuditLog("test.action", {
      requestData: {
        user: {
          email: "john@example.com",
          profile: {
            name: "John Doe",
            age: 30,
          },
        },
      },
      responseStatus: 200,
    });

    const userData = log.requestData?.user as Record<string, unknown>;
    const profileData = userData.profile as Record<string, unknown>;

    expect(userData.email).toBe("***MASKED***");
    expect(profileData.name).toBe("***MASKED***");
    expect(profileData.age).toBe(30);
  });

  it("should record errors in audit log", () => {
    const log = createAuditLog("test.action", {
      responseStatus: 500,
      error: "Internal server error",
    });

    expect(log.responseStatus).toBe(500);
    expect(log.error).toBe("Internal server error");
  });
});
