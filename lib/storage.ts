/**
 * AXCAMP Storage Helper
 * Issue #17: RLS/Storage/バケット設計
 * Signed URL generation for PDF reports
 */

import { sbAdmin } from "./supabase";

const REPORTS_BUCKET = "reports";
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

export interface UploadReportOptions {
  sessionId: string;
  reportType: "individual" | "corporate";
  pdfBuffer: Buffer;
}

export interface SignedUrlResult {
  signedUrl: string;
  publicUrl: string;
  path: string;
}

/**
 * Upload PDF report to Supabase Storage
 * Only accessible via service role (BFF)
 */
export async function uploadReport(
  options: UploadReportOptions
): Promise<SignedUrlResult> {
  const { sessionId, reportType, pdfBuffer } = options;
  const path = `${sessionId}/${reportType}.pdf`;

  // Upload PDF
  const { data: uploadData, error: uploadError } = await sbAdmin.storage
    .from(REPORTS_BUCKET)
    .upload(path, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true, // Allow overwriting
    });

  if (uploadError) {
    throw new Error(`Failed to upload report: ${uploadError.message}`);
  }

  // Generate signed URL (1 hour expiry)
  const { data: urlData, error: urlError } = await sbAdmin.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(path, DEFAULT_EXPIRY_SECONDS);

  if (urlError) {
    throw new Error(`Failed to create signed URL: ${urlError.message}`);
  }

  // Get public URL (for reference, won't work without signed token)
  const { data: publicData } = sbAdmin.storage
    .from(REPORTS_BUCKET)
    .getPublicUrl(path);

  return {
    signedUrl: urlData.signedUrl,
    publicUrl: publicData.publicUrl,
    path: uploadData.path,
  };
}

/**
 * Generate signed URL for existing report
 * Only accessible via service role (BFF)
 */
export async function getReportSignedUrl(
  sessionId: string,
  reportType: "individual" | "corporate",
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS
): Promise<string> {
  const path = `${sessionId}/${reportType}.pdf`;

  const { data, error } = await sbAdmin.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(path, expirySeconds);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete report from storage
 * Only accessible via service role (BFF)
 */
export async function deleteReport(
  sessionId: string,
  reportType: "individual" | "corporate"
): Promise<void> {
  const path = `${sessionId}/${reportType}.pdf`;

  const { error } = await sbAdmin.storage.from(REPORTS_BUCKET).remove([path]);

  if (error) {
    throw new Error(`Failed to delete report: ${error.message}`);
  }
}

/**
 * List all reports for a session
 * Only accessible via service role (BFF)
 */
export async function listSessionReports(sessionId: string): Promise<string[]> {
  const { data, error } = await sbAdmin.storage
    .from(REPORTS_BUCKET)
    .list(sessionId);

  if (error) {
    throw new Error(`Failed to list reports: ${error.message}`);
  }

  return data.map((file) => `${sessionId}/${file.name}`);
}
