/**
 * Scoring Engine — Isolated utility module (SRS Section 9.1).
 *
 * Formula:
 *   speed_bonus = floor(SPEED_BONUS_MAX × (remaining_time / total_time))
 *   raw_score   = BASE_POINTS + speed_bonus
 *   streak_mult = streak_multiplier_table[min(streak, 4)]
 *   final_score = floor(raw_score × streak_mult)
 *
 * Default config (SRS 9.2):
 *   BASE_POINTS      = 1000
 *   SPEED_BONUS_MAX  = 500
 *   Streak table:
 *     1 correct  → ×1.0
 *     2 consec.  → ×1.1
 *     3 consec.  → ×1.2
 *     4+ consec. → ×1.5 (capped)
 */

const DEFAULT_SCORING_CONFIG = {
  basePoints: 1000,
  speedBonusMax: 500,
  // Index 0 = 0 streak (no bonus), Index 1 = 1 correct, ... Index 4 = 4+ correct
  streakMultipliers: [1.0, 1.0, 1.1, 1.2, 1.5]
};

/**
 * Calculate the score for a single correct answer.
 *
 * @param {number} remainingTime  — seconds remaining on the timer when the answer was submitted
 * @param {number} totalTime      — total timer duration for the question (in seconds)
 * @param {number} currentStreak  — participant's streak count *before* this answer (0-based)
 * @param {object} [config]       — optional override of scoring parameters
 *
 * @returns {{ finalScore: number, breakdown: object }}
 *
 * @example
 *   // SRS 9.3 example: 3-streak, 12s remaining on a 30s question
 *   calculateScore(12, 30, 2) // streak before this Q was 2, now becomes 3
 *   // speed_bonus = floor(500 × (12/30)) = 200
 *   // raw_score   = 1000 + 200 = 1200
 *   // streak_mult = 1.2  (3rd consecutive correct)
 *   // final_score = floor(1200 × 1.2) = 1440
 */
function calculateScore(remainingTime, totalTime, currentStreak, config) {
  const {
    basePoints,
    speedBonusMax,
    streakMultipliers
  } = { ...DEFAULT_SCORING_CONFIG, ...config };

  // Guard: if totalTime is 0 or negative, no speed bonus
  if (totalTime <= 0) {
    return { finalScore: basePoints, breakdown: { base: basePoints, speedBonus: 0, multiplier: 1.0, rawScore: basePoints } };
  }

  // Clamp remainingTime between 0 and totalTime
  const clamped = Math.max(0, Math.min(remainingTime, totalTime));

  // SRS 9.1: speed_bonus = floor(SPEED_BONUS_MAX × (remaining_time / total_time))
  const speedBonus = Math.floor(speedBonusMax * (clamped / totalTime));

  // SRS 9.1: raw_score = BASE_POINTS + speed_bonus
  const rawScore = basePoints + speedBonus;

  // The new streak *after* this correct answer
  const newStreak = currentStreak + 1;

  // SRS 9.1: streak_mult = streak_multiplier_table[min(streak, 4)]
  const streakIndex = Math.min(newStreak, streakMultipliers.length - 1);
  const multiplier = streakMultipliers[streakIndex];

  // SRS 9.1: final_score = floor(raw_score × streak_mult)
  const finalScore = Math.floor(rawScore * multiplier);

  return {
    finalScore,
    breakdown: {
      base: basePoints,
      speedBonus,
      multiplier,
      rawScore
    }
  };
}

module.exports = {
  calculateScore,
  DEFAULT_SCORING_CONFIG
};
