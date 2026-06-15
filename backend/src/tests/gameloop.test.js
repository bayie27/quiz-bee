/**
 * Game Loop Integration Test
 *
 * Simulates a full game lifecycle through the GameStateManager:
 *   1. Add participants in lobby
 *   2. Start game
 *   3. Launch question → submit answers → verify scoring
 *   4. Timer hard-close → verify rejection
 *   5. Reveal answer → verify distribution
 *   6. Leaderboard → verify ordering with tie-break
 *   7. End game → verify final results
 */
const gameState = require('../services/gameStateManager');
const { calculateScore } = require('../services/scoring');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  }
}

// Mock question set
const MOCK_QUESTIONS = [
  {
    id: 1,
    question_set_id: 1,
    order_index: 1,
    type: 'mcq',
    text: 'What does CPU stand for?',
    options: [
      { label: 'A', text: 'Central Processing Unit' },
      { label: 'B', text: 'Central Program Unit' },
      { label: 'C', text: 'Computer Personal Unit' },
      { label: 'D', text: 'Central Power Unit' }
    ],
    correct_answer: 'A',
    image_url: null,
    timer_seconds: 30
  },
  {
    id: 2,
    question_set_id: 1,
    order_index: 2,
    type: 'truefalse',
    text: 'JavaScript is a compiled language.',
    options: [
      { label: 'True', text: 'True' },
      { label: 'False', text: 'False' }
    ],
    correct_answer: 'False',
    image_url: null,
    timer_seconds: 15
  },
  {
    id: 3,
    question_set_id: 1,
    order_index: 3,
    type: 'identification',
    text: 'What markup language is used for web pages?',
    options: null,
    correct_answer: 'HTML',
    image_url: null,
    timer_seconds: 20
  }
];

console.log('\n═══════════════════════════════════════');
console.log('  Game Loop Integration Tests');
console.log('═══════════════════════════════════════\n');

// ── Reset state ──
gameState.reset();

// ═════════════════════════════════════
// TEST: Lobby & Joining
// ═════════════════════════════════════
console.log('── Lobby & Joining ──');

// Add participants
const p1 = gameState.addParticipant('socket-1', { name: 'Alice', section: 'BSCS-3A', pin: '000000' });
assert(p1.success, 'Alice joined successfully');

const p2 = gameState.addParticipant('socket-2', { name: 'Bob', section: 'BSIT-2B', pin: '000000' });
assert(p2.success, 'Bob joined successfully');

const p3 = gameState.addParticipant('socket-3', { name: 'Charlie', section: 'BSCS-3A', pin: '000000' });
assert(p3.success, 'Charlie joined successfully');

// Duplicate name+section blocked (FR-09)
const dup = gameState.addParticipant('socket-4', { name: 'Alice', section: 'BSCS-3A', pin: '000000' });
assert(!dup.success, 'Duplicate Alice+BSCS-3A blocked');
assert(dup.error.includes('already exists'), `Error: "${dup.error}"`);

// Wrong PIN blocked (FR-06)
const badPin = gameState.addParticipant('socket-5', { name: 'Dave', section: 'BSIT-1A', pin: '999999' });
assert(!badPin.success, 'Wrong PIN blocked');

assert(gameState.getParticipantCount() === 3, `Participant count: ${gameState.getParticipantCount()}`);

// ═════════════════════════════════════
// TEST: Game Start (FR-23)
// ═════════════════════════════════════
console.log('\n── Game Start ──');

const startResult = gameState.startGame(1, MOCK_QUESTIONS, null);
assert(startResult.success, 'Game started successfully');
assert(gameState.status === 'active', `Status is '${gameState.status}'`);
assert(gameState.gameStartedAt !== null, 'gameStartedAt recorded');

// Verify joining is blocked after game start (FR-10)
const lateJoin = gameState.addParticipant('socket-6', { name: 'Eve', section: 'BSIT-1A', pin: '000000' });
assert(!lateJoin.success, 'Late join blocked');
assert(lateJoin.error === 'Game already in progress.', `Error: "${lateJoin.error}"`);

// ═════════════════════════════════════
// TEST: Launch Question 1 (FR-25, FR-26)
// ═════════════════════════════════════
console.log('\n── Question 1: MCQ ──');

const q1 = gameState.launchNextQuestion();
assert(q1 !== null, 'Question 1 launched');
assert(q1.questionNumber === 1, `Question number: ${q1.questionNumber}`);
assert(q1.question.text === 'What does CPU stand for?', 'Correct question text');
assert(gameState.timerState.remaining === 30, `Timer initialized to ${gameState.timerState.remaining}s`);
assert(gameState._answerWindowOpen === true, 'Answer window is open');

// ── Submit answers ──
// Alice answers correctly with 25s remaining
gameState.timerState.remaining = 25;
const a1 = gameState.submitAnswer('socket-1', { questionId: 1, answer: 'A' });
assert(a1.success, 'Alice answer accepted');
assert(a1.result.isCorrect === true, 'Alice is correct');
assert(a1.result.streak === 1, `Alice streak: ${a1.result.streak}`);
assert(a1.result.pointsEarned > 0, `Alice earned ${a1.result.pointsEarned} pts`);

// Bob answers incorrectly
gameState.timerState.remaining = 20;
const a2 = gameState.submitAnswer('socket-2', { questionId: 1, answer: 'C' });
assert(a2.success, 'Bob answer accepted');
assert(a2.result.isCorrect === false, 'Bob is incorrect');
assert(a2.result.pointsEarned === 0, 'Bob earned 0 pts');
assert(a2.result.streak === 0, 'Bob streak reset to 0');

// Alice tries to answer again (FR-40: first submission is final)
const a1dup = gameState.submitAnswer('socket-1', { questionId: 1, answer: 'B' });
assert(!a1dup.success, 'Alice duplicate answer blocked');
assert(a1dup.error === 'Answer already submitted.', `Error: "${a1dup.error}"`);

// ── Timer paused: submissions blocked ──
gameState.pauseTimer();
const a3paused = gameState.submitAnswer('socket-3', { questionId: 1, answer: 'A' });
assert(!a3paused.success, 'Charlie answer blocked while paused');
assert(a3paused.error === 'Timer is paused. Submissions are blocked.', `Error: "${a3paused.error}"`);

// ── Resume timer ──
gameState.resumeTimer();
gameState.timerState.remaining = 10;
const a3 = gameState.submitAnswer('socket-3', { questionId: 1, answer: 'A' });
assert(a3.success, 'Charlie answer accepted after resume');
assert(a3.result.isCorrect === true, 'Charlie is correct');

// ── Verify answer count (FR-69) ──
const status1 = gameState.getAnswerStatus();
assert(status1.answered === 3, `Answered: ${status1.answered}`);
assert(status1.total === 3, `Total: ${status1.total}`);
assert(status1.percentage === 100, `Percentage: ${status1.percentage}%`);
assert(gameState.allAnswersIn() === true, 'All answers in');

// ── Verify answer distribution (FR-49) ──
const dist1 = gameState.getAnswerDistribution();
assert(dist1.distribution['A'] === 2, `A answers: ${dist1.distribution['A']}`);
assert(dist1.distribution['C'] === 1, `C answers: ${dist1.distribution['C']}`);
assert(dist1.noAnswerCount === 0, `No answer: ${dist1.noAnswerCount}`);

// ═════════════════════════════════════
// TEST: Timer Hard-Close (FR-27)
// ═════════════════════════════════════
console.log('\n── Timer Hard-Close (FR-27) ──');

// Launch Q2 and simulate timer expiry
const q2 = gameState.launchNextQuestion();
assert(q2 !== null, 'Question 2 launched');
assert(q2.question.timer_seconds === 15, `Timer: ${q2.question.timer_seconds}s`);

// Alice answers before timer expires
gameState.timerState.remaining = 10;
const q2a1 = gameState.submitAnswer('socket-1', { questionId: 2, answer: 'False' });
assert(q2a1.success, 'Alice answered Q2 before expiry');
assert(q2a1.result.isCorrect === true, 'Alice correct on Q2');
assert(q2a1.result.streak === 2, `Alice streak: ${q2a1.result.streak}`);

// Simulate timer expiry → hard-close
gameState.closeAnswerWindow();
assert(gameState._answerWindowOpen === false, 'Answer window closed');
assert(gameState.timerState.remaining === 0, 'Timer at 0');

// Bob tries to answer after hard-close (FR-27, FR-41)
const q2a2 = gameState.submitAnswer('socket-2', { questionId: 2, answer: 'False' });
assert(!q2a2.success, 'Bob answer rejected after hard-close');
assert(q2a2.error === 'Answer window is closed.', `Error: "${q2a2.error}"`);

// ═════════════════════════════════════
// TEST: Identification Question (FR-15)
// ═════════════════════════════════════
console.log('\n── Question 3: Identification (FR-15) ──');

const q3 = gameState.launchNextQuestion();
assert(q3 !== null, 'Question 3 launched');

// Alice answers with different case + whitespace → should be correct (FR-15)
gameState.timerState.remaining = 15;
const q3a1 = gameState.submitAnswer('socket-1', { questionId: 3, answer: '  html  ' });
assert(q3a1.success, 'Alice answer accepted');
assert(q3a1.result.isCorrect === true, 'Case-insensitive + trimmed match works');
assert(q3a1.result.streak === 3, `Alice streak: ${q3a1.result.streak} (3-streak ×1.2)`);

// Bob answers with a wrong spelling → should be incorrect
gameState.timerState.remaining = 12;
const q3a2 = gameState.submitAnswer('socket-2', { questionId: 3, answer: 'HTMML' });
assert(q3a2.success, 'Bob answer accepted');
assert(q3a2.result.isCorrect === false, 'Wrong spelling rejected (exact match only)');

// ═════════════════════════════════════
// TEST: Leaderboard & Ranking
// ═════════════════════════════════════
console.log('\n── Leaderboard & Ranking ──');

const leaderboard = gameState.getLeaderboard(10);
assert(leaderboard.length === 3, `Leaderboard has ${leaderboard.length} entries`);
assert(leaderboard[0].name === 'Alice', `#1 is ${leaderboard[0].name}`);
assert(leaderboard[0].rank === 1, `Alice rank: ${leaderboard[0].rank}`);
assert(leaderboard[0].score > leaderboard[1].score, 'Alice score > #2 score');

console.log('  Leaderboard:');
leaderboard.forEach(p => {
  console.log(`    #${p.rank} ${p.name} (${p.section}) — ${p.score} pts, streak: ${p.streak}`);
});

// ═════════════════════════════════════
// TEST: End Game & No More Questions
// ═════════════════════════════════════
console.log('\n── End Game ──');

const q4 = gameState.launchNextQuestion();
assert(q4 === null, 'No more questions → returns null');

gameState.endGame();
assert(gameState.status === 'ended', `Status: ${gameState.status}`);

const podium = gameState.getPodium();
assert(podium.length === 3, `Podium: ${podium.length} entries (all 3 participants)`);

const finalResults = gameState.getFinalResults();
assert(finalResults.length === 3, `Final results: ${finalResults.length}`);
assert(finalResults[0].final_rank === 1, 'First result has rank 1');
assert(finalResults[0].participant_name === 'Alice', `Top: ${finalResults[0].participant_name}`);
assert(finalResults[0].best_streak === 3, `Best streak: ${finalResults[0].best_streak}`);
assert(finalResults[0].avg_answer_time_ms >= 0, `Avg answer time: ${finalResults[0].avg_answer_time_ms}ms (≥0 in sync tests)`);

// ═════════════════════════════════════
// TEST: hasMoreQuestions & getNextQuestionPreview
// ═════════════════════════════════════
console.log('\n── Helper Methods ──');

gameState.reset();
gameState.addParticipant('socket-a', { name: 'Test', section: 'T1', pin: '000000' });
gameState.startGame(1, MOCK_QUESTIONS, null);

assert(gameState.hasMoreQuestions() === true, 'hasMoreQuestions before launch');

gameState.launchNextQuestion();
assert(gameState.hasMoreQuestions() === true, 'hasMoreQuestions after Q1');

const preview = gameState.getNextQuestionPreview();
assert(preview !== null, 'Next question preview available');
assert(preview.questionNumber === 2, `Preview is Q${preview.questionNumber}`);
assert(preview.answer === 'False', `Preview answer: ${preview.answer}`);

gameState.launchNextQuestion();
gameState.launchNextQuestion(); // Q3
assert(gameState.hasMoreQuestions() === false, 'No more questions after Q3');
assert(gameState.getNextQuestionPreview() === null, 'No next preview');

// ═════════════════════════════════════
// SUMMARY
// ═════════════════════════════════════
console.log('\n═══════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════\n');

if (failed > 0) process.exitCode = 1;
