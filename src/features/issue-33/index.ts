/**
 * ROI Calculation - Issue #33
 */

export function calculateROI(score: number, domain: string) {
  return { roi: score * 100, savings: score * 10000, chart: { labels: ["Before", "After"], data: [0, score] } };
}
