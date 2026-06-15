/**
 * Scoring Engine — Unit Tests
 *
 * Validates the exact math formula from SRS Section 9.1 and the example from 9.3.
 */
const { calculateScore, DEFAULT_SCORING_CONFIG } = require('../services/scoring');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${message}`);
  }
}

console.log('\n=== Scoring Engine Tests ===\n');

// Test 1: SRS 9.3 exact example
// 3-streak, 12s remaining on 30s question
// streak before this answer = 2 (this is the 3rd consecutive correct)
console.log('Test 1: SRS 9.3 example (3-streak, 12s/30s)');
{
  const result = calculateScore(12, 30, 2);
  assert(result.breakdown.speedBonus === 200, `speed_bonus should be 200, got ${result.breakdown.speedBonus}`);
  assert(result.breakdown.rawScore === 1200, `raw_score should be 1200, got ${result.breakdown.rawScore}`);
  assert(result.breakdown.multiplier === 1.2, `multiplier should be 1.2, got ${result.breakdown.multiplier}`);
  assert(result.finalScore === 1440, `final_score should be 1440, got ${result.finalScore}`);
}

// Test 2: First correct answer (no streak) — multiplier should be ×1.0
console.log('\nTest 2: First correct answer (streak=0, 20s/30s)');
{
  const result = calculateScore(20, 30, 0);
  assert(result.breakdown.speedBonus === 333, `speed_bonus should be 333, got ${result.breakdown.speedBonus}`);
  assert(result.breakdown.multiplier === 1.0, `multiplier should be 1.0, got ${result.breakdown.multiplier}`);
  assert(result.finalScore === 1333, `final_score should be 1333, got ${result.finalScore}`);
}

// Test 3: 2-streak — multiplier should be ×1.1
console.log('\nTest 3: 2-streak (15s/30s)');
{
  const result = calculateScore(15, 30, 1);
  assert(result.breakdown.speedBonus === 250, `speed_bonus should be 250, got ${result.breakdown.speedBonus}`);
  assert(result.breakdown.multiplier === 1.1, `multiplier should be 1.1, got ${result.breakdown.multiplier}`);
  assert(result.finalScore === 1375, `final_score should be 1375, got ${result.finalScore}`);
}

// Test 4: 4+ streak — multiplier should be capped at ×1.5
console.log('\nTest 4: 5-streak capped at ×1.5 (30s/30s)');
{
  const result = calculateScore(30, 30, 4); // 5th consecutive
  assert(result.breakdown.speedBonus === 500, `speed_bonus should be 500, got ${result.breakdown.speedBonus}`);
  assert(result.breakdown.multiplier === 1.5, `multiplier should be 1.5, got ${result.breakdown.multiplier}`);
  assert(result.finalScore === 2250, `final_score should be 2250, got ${result.finalScore}`);
}

// Test 5: 0 remaining time — no speed bonus
console.log('\nTest 5: Answered at 0s remaining (no speed bonus)');
{
  const result = calculateScore(0, 30, 0);
  assert(result.breakdown.speedBonus === 0, `speed_bonus should be 0, got ${result.breakdown.speedBonus}`);
  assert(result.finalScore === 1000, `final_score should be 1000, got ${result.finalScore}`);
}

// Test 6: Edge case — totalTime is 0
console.log('\nTest 6: Edge case — totalTime = 0');
{
  const result = calculateScore(5, 0, 0);
  assert(result.finalScore === 1000, `final_score should be 1000 (base only), got ${result.finalScore}`);
}

// Test 7: Custom scoring config
console.log('\nTest 7: Custom scoring config');
{
  const customConfig = { basePoints: 500, speedBonusMax: 250, streakMultipliers: [1.0, 1.0, 1.2, 1.5, 2.0] };
  const result = calculateScore(15, 30, 0, customConfig);
  assert(result.breakdown.base === 500, `base should be 500, got ${result.breakdown.base}`);
  assert(result.breakdown.speedBonus === 125, `speed_bonus should be 125, got ${result.breakdown.speedBonus}`);
  assert(result.finalScore === 625, `final_score should be 625, got ${result.finalScore}`);
}

console.log('\n=== Tests Complete ===\n');
