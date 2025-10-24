/**
 * Supplementary Question Screen - Issue #30
 */

export function getSupplementaryQuestion(domain: string) {
  return { questionId: `supp-${domain}-1`, stem: `Supplementary question for ${domain}` };
}
