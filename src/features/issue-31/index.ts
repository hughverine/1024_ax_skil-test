/**
 * Results Screen + PDF Export - Issue #31
 */

export function generateReport(sessionId: string) {
  return { reportUrl: `/api/reports/${sessionId}`, pdfUrl: `/api/reports/${sessionId}/pdf` };
}
