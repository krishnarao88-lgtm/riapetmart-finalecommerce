// Malaysia has no daylight saving, so Kuala Lumpur is always UTC+8.
const KL_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant of the most recent midnight in Asia/Kuala_Lumpur. */
export function startOfTodayInKL(now = new Date()): Date {
  return new Date(Math.floor((now.getTime() + KL_OFFSET_MS) / DAY_MS) * DAY_MS - KL_OFFSET_MS);
}
