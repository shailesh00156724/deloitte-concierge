/**
 * Turns a PolicyFinding into a user-facing sentence. Kept as its own pure
 * function (rather than inlined) so the wording lives in one place and the
 * evaluation algorithm stays focused on determining outcomes, not prose.
 *
 * @param {import('../types.js').PolicyFinding} finding
 * @returns {string}
 */
export function explain(finding) {
  return finding.message;
}

/** Headline sentence shown above the per-finding detail, keyed by outcome. */
export const OUTCOME_HEADLINES = {
  green: 'This request is within the sample policy. Booking may proceed, subject to any standard approval.',
  amber:
    'This request falls into a sample policy exception band. Explicit approval is mandatory before proceeding.',
  red: 'This request is not permitted under sample policy. Booking is blocked.',
  unknown:
    'Sample policy data does not cover this combination of details. This has been routed for manual review and booking is blocked.',
};
