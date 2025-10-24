/**
 * API Endpoints and PII Encryption Module
 * Issue #27: エンドポイント群の実装 + PII暗号化
 *
 * Core logic for API endpoints with PII encryption and audit logging
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";

// ==================== Types ====================

export type ParticipantInfo = {
  name: string;
  email: string;
  company?: string;
  department?: string;
};

export type TestSession = {
  id: string;
  userId: string; // Encrypted PII
  participantEmail: string; // Encrypted PII
  participantName: string; // Encrypted PII
  startedAt: Date;
  completedAt?: Date;
  currentQuestionIndex: number;
  answers: Answer[];
  status: "in_progress" | "main_completed" | "followup_completed" | "finished";
};

export type Answer = {
  questionId: string;
  answer: string[];
  score?: number;
  submittedAt: Date;
};

export type AuditLog = {
  id: string;
  timestamp: Date;
  action: string;
  userId?: string; // Masked/Hashed
  sessionId?: string;
  ipAddress?: string; // Masked
  userAgent?: string;
  requestData?: Record<string, unknown>; // PII masked
  responseStatus: number;
  error?: string;
};

export type APIResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

// ==================== PII Encryption ====================

/**
 * Encrypt PII using AES-256-GCM
 *
 * @param plaintext - Plain text to encrypt
 * @param key - Base64-encoded 32-byte encryption key (defaults to env var PII_ENC_KEY)
 * @returns Base64-encoded encrypted data (IV + Auth Tag + Ciphertext)
 */
export function encryptPII(plaintext: string, key?: string): string {
  // Get encryption key from parameter or environment
  const keyBase64 = key || process.env.PII_ENC_KEY;
  if (!keyBase64) {
    throw new Error("PII encryption key not configured");
  }

  const keyBuffer = Buffer.from(keyBase64, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error("PII encryption key must be 32 bytes (AES-256)");
  }

  // Generate random IV (12 bytes for GCM)
  const iv = randomBytes(12);

  // Create cipher
  const cipher = createCipheriv("aes-256-gcm", keyBuffer, iv);

  // Encrypt data
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Combine: IV (12 bytes) + Auth Tag (16 bytes) + Encrypted Data
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // Return as base64
  return combined.toString("base64");
}

/**
 * Decrypt PII using AES-256-GCM
 *
 * @param ciphertext - Base64-encoded encrypted data (IV + Auth Tag + Ciphertext)
 * @param key - Base64-encoded 32-byte encryption key (defaults to env var PII_ENC_KEY)
 * @returns Decrypted plaintext
 */
export function decryptPII(ciphertext: string, key?: string): string {
  // Get encryption key from parameter or environment
  const keyBase64 = key || process.env.PII_ENC_KEY;
  if (!keyBase64) {
    throw new Error("PII encryption key not configured");
  }

  const keyBuffer = Buffer.from(keyBase64, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error("PII encryption key must be 32 bytes (AES-256)");
  }

  // Decode from base64
  const combined = Buffer.from(ciphertext, "base64");

  // Extract components
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const encrypted = combined.subarray(28);

  // Create decipher
  const decipher = createDecipheriv("aes-256-gcm", keyBuffer, iv);
  decipher.setAuthTag(authTag);

  // Decrypt data
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Hash PII for audit logging (one-way, irreversible)
 *
 * @param pii - PII to hash
 * @returns SHA-256 hash (hex)
 */
export function hashPII(pii: string): string {
  return createHash("sha256").update(pii).digest("hex");
}

// ==================== API Endpoint Logic ====================

/**
 * POST /api/tests/start
 * Create participant and start test session with PII encryption
 */
export function startTest(
  participant: ParticipantInfo
): APIResponse<{ sessionId: string; token: string }> {
  try {
    // Validate participant info
    if (!participant.name || !participant.email) {
      return {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Name and email are required",
        },
      };
    }

    // Encrypt PII
    const encryptedEmail = encryptPII(participant.email);
    const encryptedName = encryptPII(participant.name);

    // Generate session ID and token
    const sessionId = generateSessionId();
    const token = generateToken();

    // In production: save to database
    // const session: TestSession = {
    //   id: sessionId,
    //   userId: hashPII(participant.email), // Hashed for indexing
    //   participantEmail: encryptedEmail,
    //   participantName: encryptedName,
    //   startedAt: new Date(),
    //   currentQuestionIndex: 0,
    //   answers: [],
    //   status: "in_progress",
    // };

    return {
      success: true,
      data: {
        sessionId,
        token,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * POST /api/tests/{id}/next
 * Get next question for the session
 */
export function getNextQuestion(
  sessionId: string,
  token: string
): APIResponse<{ questionId: string; question: unknown }> {
  try {
    // Validate session and token
    // In production: fetch from database and validate

    // Generate next question
    const questionId = `q-${Date.now()}`;

    return {
      success: true,
      data: {
        questionId,
        question: {
          stem: "Sample question",
          type: "mcq",
          choices: { A: "Option A", B: "Option B" },
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * POST /api/tests/{id}/submit
 * Submit answer and get grading result
 */
export function submitAnswer(
  sessionId: string,
  questionId: string,
  answer: string[],
  token: string
): APIResponse<{ score: number; feedback?: string }> {
  try {
    // Validate session and token
    // In production: fetch from database and validate

    // Grade answer (using grading modules from Issue #24/#25)
    const score = 0.8; // Placeholder

    return {
      success: true,
      data: {
        score,
        feedback: "Good answer!",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * POST /api/tests/{id}/complete
 * Check if supplementary questions are needed
 */
export function completeMainTest(
  sessionId: string,
  token: string
): APIResponse<{ needsFollowup: boolean; domains?: string[] }> {
  try {
    // Validate session and token
    // In production: fetch from database and validate

    // Use Issue #26 logic to identify weak domains
    const needsFollowup = false; // Placeholder
    const domains: string[] = []; // Placeholder

    return {
      success: true,
      data: {
        needsFollowup,
        domains,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * GET /api/reports/{id}?token=...
 * Generate and retrieve test report
 */
export function getReport(
  sessionId: string,
  token: string
): APIResponse<{ reportUrl: string; expiresAt: Date }> {
  try {
    // Validate session and token
    // In production: fetch from database and validate

    // Generate signed URL for report (valid for 24 hours)
    const signedUrl = generateSignedUrl(sessionId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      success: true,
      data: {
        reportUrl: signedUrl,
        expiresAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

// ==================== Audit Logging ====================

/**
 * Create audit log entry
 *
 * @param action - Action name (e.g., "test.start", "test.submit")
 * @param data - Request/response data (PII will be masked)
 * @returns Audit log entry
 */
export function createAuditLog(
  action: string,
  data: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestData?: Record<string, unknown>;
    responseStatus: number;
    error?: string;
  }
): AuditLog {
  return {
    id: generateAuditLogId(),
    timestamp: new Date(),
    action,
    userId: data.userId ? hashPII(data.userId) : undefined, // Hash instead of encrypt
    sessionId: data.sessionId,
    ipAddress: data.ipAddress ? maskIP(data.ipAddress) : undefined,
    userAgent: data.userAgent,
    requestData: data.requestData ? maskPIIInObject(data.requestData) : undefined,
    responseStatus: data.responseStatus,
    error: data.error,
  };
}

/**
 * Mask PII in object for audit logging
 */
function maskPIIInObject(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  const piiFields = ["email", "name", "phone", "address", "ssn", "password", "token"];

  for (const [key, value] of Object.entries(obj)) {
    if (piiFields.some((field) => key.toLowerCase().includes(field))) {
      masked[key] = "***MASKED***";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      masked[key] = maskPIIInObject(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Mask IP address for audit logging (keep first 2 octets)
 */
function maskIP(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return "xxx.xxx.xxx.xxx";
}

// ==================== Helper Functions ====================

function generateSessionId(): string {
  return `sess_${randomBytes(16).toString("hex")}`;
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function generateAuditLogId(): string {
  return `audit_${Date.now()}_${randomBytes(8).toString("hex")}`;
}

function generateSignedUrl(sessionId: string): string {
  // In production: use proper signed URL with HMAC
  const signature = createHash("sha256")
    .update(`${sessionId}-${Date.now()}`)
    .digest("hex");
  return `/api/reports/${sessionId}?sig=${signature}`;
}
