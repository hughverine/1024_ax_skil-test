# Issue #27: エンドポイント群の実装 + PII暗号化

**Status**: Implemented ✅

Task request file: `.ai/task-requests/issue-27.md`

---

## Overview

Core logic for API endpoints with PII encryption (AES-256-GCM) and audit logging. Provides secure session management, question delivery, answer grading, and report generation.

## Features

### 1. PII Encryption (AES-256-GCM)

- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Management**: 32-byte key from `PII_ENC_KEY` environment variable
- **Format**: Base64(IV + Auth Tag + Ciphertext)
- **Properties**: Random IV per encryption, authenticated encryption prevents tampering

### 2. API Endpoint Logic

Six core endpoints implemented:

1. `POST /api/tests/start` - Create participant, start session, encrypt PII
2. `POST /api/tests/{id}/next` - Get next question
3. `POST /api/tests/{id}/submit` - Submit answer, get score
4. `POST /api/tests/{id}/complete` - Check if supplementary questions needed
5. `POST /api/tests/{id}/followups/*` - Supplementary questions (TBD)
6. `GET /api/reports/{id}?token=...` - Get report with signed URL

### 3. Audit Logging

- Records all API events with PII masking
- Hashes userId for indexing (SHA-256)
- Masks IP addresses (keeps first 2 octets)
- Masks PII fields in request/response data
- Nested object support

## API

### PII Encryption

#### `encryptPII(plaintext, key?)`

```typescript
encryptPII(plaintext: string, key?: string): string
```

Encrypt PII using AES-256-GCM.

**Parameters:**
- `plaintext`: Data to encrypt
- `key`: Base64-encoded 32-byte key (defaults to `process.env.PII_ENC_KEY`)

**Returns:** Base64-encoded encrypted data (IV + Auth Tag + Ciphertext)

**Example:**
```typescript
const encrypted = encryptPII("john.doe@example.com");
// => "abcd1234...base64..."
```

#### `decryptPII(ciphertext, key?)`

```typescript
decryptPII(ciphertext: string, key?: string): string
```

Decrypt PII encrypted with `encryptPII`.

**Parameters:**
- `ciphertext`: Base64-encoded encrypted data
- `key`: Base64-encoded 32-byte key (defaults to `process.env.PII_ENC_KEY`)

**Returns:** Decrypted plaintext

**Example:**
```typescript
const decrypted = decryptPII("abcd1234...base64...");
// => "john.doe@example.com"
```

#### `hashPII(pii)`

```typescript
hashPII(pii: string): string
```

One-way hash for PII (SHA-256). Used for indexing without storing plaintext.

**Returns:** 64-character hex hash

### API Endpoints

#### `startTest(participant)`

```typescript
startTest(participant: ParticipantInfo): APIResponse<{
  sessionId: string;
  token: string;
}>
```

Create participant and start test session.

**Parameters:**
```typescript
{
  name: string;
  email: string;
  company?: string;
  department?: string;
}
```

**Returns:**
```typescript
{
  success: true,
  data: {
    sessionId: "sess_...",  // 32-byte hex
    token: "..."            // Base64url token
  }
}
```

#### `getNextQuestion(sessionId, token)`

Get next question for the session.

**Returns:** Question object with questionId and question data.

#### `submitAnswer(sessionId, questionId, answer, token)`

Submit answer and get grading result.

**Returns:** Score (0.0-1.0) and optional feedback.

#### `completeMainTest(sessionId, token)`

Check if supplementary questions are needed.

**Returns:** `needsFollowup` boolean and optional weak domains array.

#### `getReport(sessionId, token)`

Generate and retrieve test report with signed URL (24-hour expiration).

**Returns:** Report URL and expiration timestamp.

### Audit Logging

#### `createAuditLog(action, data)`

```typescript
createAuditLog(
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
): AuditLog
```

Create audit log entry with PII masking.

**Returns:**
```typescript
{
  id: "audit_...",
  timestamp: Date,
  action: "test.start",
  userId: "sha256_hash...",      // Hashed
  ipAddress: "192.168.xxx.xxx",  // Masked
  requestData: { ... },          // PII masked
  responseStatus: 200
}
```

## Encryption Details

### AES-256-GCM Structure

```
[IV (12 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext (variable)]
                    ↓
              Base64 encode
```

**Why GCM?**
- Provides both confidentiality (encryption) and authenticity (prevents tampering)
- Faster than CBC+HMAC
- Industry standard for authenticated encryption

### Key Generation

Generate a secure 32-byte key:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# OpenSSL
openssl rand -base64 32
```

Set in `.env`:
```
PII_ENC_KEY=your_base64_key_here
```

## PII Masking Rules

Fields automatically masked in audit logs:
- `email`
- `name`
- `phone`
- `address`
- `ssn`
- `password`
- `token`

Nested objects are recursively masked.

## Testing

Comprehensive test coverage (21 test cases):

**PII Encryption (9 tests)**
- Encrypt/decrypt round-trip
- Random IV (different ciphertexts)
- Unicode support
- Error handling (missing key, invalid ciphertext)
- SHA-256 hashing

**API Endpoints (8 tests)**
- startTest (success, validation errors)
- getNextQuestion
- submitAnswer
- completeMainTest
- getReport (URL generation, expiration)

**Audit Logging (4 tests)**
- Hashed userId
- IP masking
- PII field masking
- Nested object masking

Run tests:
```bash
npm test src/features/issue-27
```

## Security Considerations

1. **Key Storage**: Store `PII_ENC_KEY` in secure secret management (AWS Secrets Manager, HashiCorp Vault, etc.). Never commit to git.

2. **Key Rotation**: Implement key rotation strategy. Maintain old keys for decrypting existing data while encrypting new data with new key.

3. **Transport Security**: Always use HTTPS in production. Encryption at rest doesn't protect in-transit data.

4. **Access Control**: Limit database access. Even encrypted PII should be access-controlled.

5. **Audit Log Retention**: Comply with data retention policies. Audit logs contain hashed PIIs which may be subject to GDPR/CCPA.

## Production Integration

### Next.js Route Handlers

```typescript
// app/api/tests/start/route.ts
import { startTest, createAuditLog } from "@/features/issue-27";

export async function POST(request: Request) {
  const body = await request.json();

  // Call core logic
  const result = startTest(body);

  // Create audit log
  const log = createAuditLog("test.start", {
    requestData: body,
    responseStatus: result.success ? 200 : 400,
  });

  // Save to database: await db.auditLogs.create(log);

  return Response.json(result, {
    status: result.success ? 200 : 400
  });
}
```

### Database Schema

```sql
CREATE TABLE test_sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,  -- Hashed for indexing
  participant_email TEXT NOT NULL,  -- Encrypted
  participant_name TEXT NOT NULL,   -- Encrypted
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_started_at (started_at)
);

CREATE TABLE audit_logs (
  id VARCHAR(128) PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  action VARCHAR(64) NOT NULL,
  user_id VARCHAR(64),  -- Hashed
  session_id VARCHAR(64),
  ip_address VARCHAR(20),  -- Masked
  user_agent TEXT,
  request_data JSONB,  -- PII masked
  response_status INT NOT NULL,
  error TEXT,
  INDEX idx_timestamp (timestamp),
  INDEX idx_action (action)
);
```

## Acceptance Criteria (DoD)

- ✅ PII encrypted with AES-256-GCM before database storage
- ✅ All API endpoint logic implemented
- ✅ Audit logging with PII masking
- ⏳ Production: Integrate with Next.js Route Handlers
- ⏳ Production: Connect to actual database
- ⏳ Production: Implement proper token validation

## Related Issues

- Relates to #8 (EPIC 7: API/BFF implementation)
- Uses #24 (MCQ grading) and #25 (Free-form grading)
- Uses #26 (Supplementary questions logic)
- Used by #28 (Start form), #29 (Test screen), #31 (Results screen)

## Notes

- This module provides core logic only. Next.js route handlers in `/app/api/` will call these functions.
- Database integration is placeholder - production needs Supabase/PostgreSQL connection.
- Token validation is placeholder - production needs JWT or secure session tokens.
- Signed URLs use simple SHA-256 - production should use HMAC with secret key.
