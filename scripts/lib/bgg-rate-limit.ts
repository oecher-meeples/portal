import { sleep } from "../../src/lib/utils/sleep";
import { BggApiError } from "../../src/lib/bgg/client";

// BGGs tatsächliches Rate-Limit ist strenger als die im Massenimport (#186)
// dokumentierten "2 Anfragen/Sekunde" — ein erster Lauf mit 600ms brach nach
// ca. 30 Titeln in eine Serie von 429ern ein. Deutlich konservativer, dafür
// mit Backoff-Retry statt einem harten Fail bei einem gelegentlichen 429.
export const BGG_SCRIPT_THROTTLE_MS = 4000;
const RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BACKOFF_MS = 30_000;

/** BGGs 429 ist meist eine kurzfristige Drossel, keine dauerhafte Sperre —
 * ein paar Anläufe mit langer Pause dazwischen kommen fast immer durch. */
export async function withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error instanceof BggApiError && error.status === 429;
      if (!isRateLimit || attempt >= RATE_LIMIT_RETRIES) throw error;
      console.warn(
        `  429 von BGG — warte ${RATE_LIMIT_BACKOFF_MS / 1000}s (Versuch ${attempt + 1}/${RATE_LIMIT_RETRIES})…`,
      );
      await sleep(RATE_LIMIT_BACKOFF_MS);
    }
  }
}
