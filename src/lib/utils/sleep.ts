/** Promise-based delay — used to throttle sequential external API calls
 * (z. B. BGGs Rate-Limit beim Massenimport, siehe #186). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
