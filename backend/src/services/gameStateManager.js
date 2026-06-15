const crypto = require('crypto');
const { calculateScore } = require('./scoring');

/**
 * GameStateManager — Authoritative in-memory game state (SRS Section 8.2).
 *
 * Single-room model (FR-01, C-05). All scoring, streaks, and answer
 * validation happen here; clients never hold authoritative state.
 *
 * Locked requirements baked in:
 *  - Tie-break by fastest average answer time
 *  - Submissions blocked while timer is paused
 *  - Kicked participants are fully erased
 *  - Disconnected participants who exceed the grace period are permanently
 *    blocked from the current session
 */
class GameStateManager {
  constructor() {
    this.reset();
  }

  // ──────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────

  /**
   * Full reset — returns the room to lobby state (FR-02).
   * Clears participants and scores but leaves question sets untouched in DB.
   */
  reset() {
    this.status = 'lobby'; // 'lobby' | 'active' | 'ended'
    this.questionSetId = null;
    this.currentQuestionIndex = -1;
    this.currentQuestion = null;
    this.questions = []; // ordered question list loaded from DB at game start
    this.gameStartedAt = null;   // ISO timestamp for session persistence

    this.timerState = {
      total: 0,
      remaining: 0,
      paused: false,
      intervalId: null,
      questionLaunchedAt: null   // high-resolution timestamp for speed bonus accuracy
    };

    // socketId → participant data
    this.participants = new Map();

    // participantId → answer data (for the *current* question only)
    this.answers = new Map();
    this.answerCount = 0;

    // Track participants permanently blocked from the session (locked req)
    this.blockedParticipants = new Set(); // Set of "name::section" keys

    // Track disconnected participants pending reconnection
    // key: "name::section", value: { socketId, timeoutId, participantData }
    this.disconnectedParticipants = new Map();

    // Scoring config (defaults from SRS 9.2, overridable per question set)
    this.scoringConfig = {
      basePoints: 1000,
      speedBonusMax: 500,
      streakMultipliers: [1.0, 1.0, 1.1, 1.2, 1.5]
    };

    // Room config (fetched from Supabase room_settings on boot)
    this.roomConfig = this.roomConfig || {
      hostPin: '1234',
      roomPin: '000000',
      maxParticipants: 500,
      reconnectGraceSeconds: 10
    };

    // Whether the answer window is currently open
    this._answerWindowOpen = false;
  }

  // ──────────────────────────────────────────────
  // Room Config
  // ──────────────────────────────────────────────

  /**
   * Load room settings from Supabase at server startup.
   * @param {object} settings — row from room_settings table
   */
  loadRoomConfig(settings) {
    if (!settings) return;
    this.roomConfig.hostPin = settings.host_pin || this.roomConfig.hostPin;
    this.roomConfig.roomPin = settings.room_pin || this.roomConfig.roomPin;
    this.roomConfig.maxParticipants = settings.max_participants ?? this.roomConfig.maxParticipants;
    this.roomConfig.reconnectGraceSeconds = settings.reconnect_grace_seconds ?? this.roomConfig.reconnectGraceSeconds;
  }

  /**
   * Load scoring config from question set (FR-42).
   * @param {object} config — JSONB from question_sets.scoring_config
   */
  loadScoringConfig(config) {
    if (!config) return;
    this.scoringConfig.basePoints = config.base_points ?? this.scoringConfig.basePoints;
    this.scoringConfig.speedBonusMax = config.speed_bonus_max ?? this.scoringConfig.speedBonusMax;
    this.scoringConfig.streakMultipliers = config.streak_multipliers ?? this.scoringConfig.streakMultipliers;
  }

  // ──────────────────────────────────────────────
  // Participant Management (FR-06 through FR-12)
  // ──────────────────────────────────────────────

  /**
   * Generate a composite key for uniqueness checks (FR-09).
   */
  _participantKey(name, section) {
    return `${name.trim().toLowerCase()}::${section.trim().toLowerCase()}`;
  }

  /**
   * Generate a cryptographic session token for reconnection (FR-11).
   */
  _generateSessionToken() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Attempt to add a participant to the room.
   *
   * Validates: PIN (FR-06), game status (FR-10), capacity (FR-03),
   * duplicate name+section (FR-09), blocked list (locked req).
   *
   * @param {string} socketId
   * @param {object} data — { name, section, pin, avatar?, accentColor? }
   * @returns {{ success: boolean, error?: string, participant?: object }}
   */
  addParticipant(socketId, { name, section, pin, avatar, accentColor }) {
    // Validate PIN (FR-06)
    if (pin !== this.roomConfig.roomPin) {
      return { success: false, error: 'Invalid room PIN.' };
    }

    // Block joins if game is active (FR-10)
    if (this.status === 'active') {
      return { success: false, error: 'Game already in progress.' };
    }

    // Block joins if game already ended
    if (this.status === 'ended') {
      return { success: false, error: 'Game has ended.' };
    }

    const key = this._participantKey(name, section);

    // Block permanently banned participants (locked req: expired reconnect)
    if (this.blockedParticipants.has(key)) {
      return { success: false, error: 'You have been permanently blocked from this session.' };
    }

    // Check capacity (FR-03)
    if (this.participants.size >= this.roomConfig.maxParticipants) {
      return { success: false, error: 'Room is full. Maximum participant cap reached.' };
    }

    // Check duplicate name + section (FR-09)
    for (const p of this.participants.values()) {
      if (this._participantKey(p.name, p.section) === key) {
        return { success: false, error: 'A participant with this name and section already exists.' };
      }
    }

    const participantId = crypto.randomUUID();
    const sessionToken = this._generateSessionToken();

    const participant = {
      id: participantId,
      name: name.trim(),
      section: section.trim(),
      avatar: avatar || null,
      accentColor: accentColor || null,
      score: 0,
      streak: 0,
      bestStreak: 0,
      rank: 0,
      answeredCurrentQuestion: false,
      sessionToken,
      disconnectedAt: null,
      totalAnswerTimeMs: 0,   // cumulative answer time for tie-breaking
      correctAnswerCount: 0   // for computing average answer time
    };

    this.participants.set(socketId, participant);
    return { success: true, participant };
  }

  /**
   * Handle participant reconnection within the grace period (FR-11).
   *
   * @param {string} newSocketId
   * @param {object} data — { name, section, sessionToken }
   * @returns {{ success: boolean, error?: string, participant?: object }}
   */
  rejoinParticipant(newSocketId, { name, section, sessionToken }) {
    const key = this._participantKey(name, section);

    // Check if participant is in the disconnected pool
    const disconnected = this.disconnectedParticipants.get(key);
    if (!disconnected) {
      return { success: false, error: 'No active session found for reconnection.' };
    }

    // Validate session token
    if (disconnected.participantData.sessionToken !== sessionToken) {
      return { success: false, error: 'Invalid session token.' };
    }

    // Cancel the grace period timeout
    clearTimeout(disconnected.timeoutId);
    this.disconnectedParticipants.delete(key);

    // Restore participant data under the new socket ID
    const participant = {
      ...disconnected.participantData,
      disconnectedAt: null
    };
    this.participants.set(newSocketId, participant);

    return { success: true, participant };
  }

  /**
   * Handle socket disconnection. Starts the 10-second grace period (FR-11/FR-12).
   *
   * @param {string} socketId
   * @param {function} onGraceExpired — callback when the grace period expires
   * @returns {object|null} — participant data if found, null otherwise
   */
  handleDisconnect(socketId, onGraceExpired) {
    const participant = this.participants.get(socketId);
    if (!participant) return null;

    // Remove from active participants
    this.participants.delete(socketId);

    // If game is in lobby, just remove them cleanly (they can rejoin normally)
    if (this.status === 'lobby') {
      return participant;
    }

    // During an active game, start grace period (FR-11)
    const key = this._participantKey(participant.name, participant.section);
    participant.disconnectedAt = Date.now();

    const timeoutId = setTimeout(() => {
      // Grace period expired (FR-12) — permanently block
      this.disconnectedParticipants.delete(key);
      this.blockedParticipants.add(key);
      if (onGraceExpired) onGraceExpired(participant);
    }, this.roomConfig.reconnectGraceSeconds * 1000);

    this.disconnectedParticipants.set(key, {
      socketId,
      timeoutId,
      participantData: participant
    });

    return participant;
  }

  /**
   * Kick a participant — completely erase from memory (locked requirement).
   *
   * @param {string} participantId
   * @returns {{ socketId: string, participant: object }|null}
   */
  kickParticipant(participantId) {
    for (const [socketId, participant] of this.participants.entries()) {
      if (participant.id === participantId) {
        this.participants.delete(socketId);
        // Also block them from re-joining
        const key = this._participantKey(participant.name, participant.section);
        this.blockedParticipants.add(key);
        // Recalculate ranks after removal
        this.recalculateRanks();
        return { socketId, participant };
      }
    }
    return null;
  }

  // ──────────────────────────────────────────────
  // Game Flow
  // ──────────────────────────────────────────────

  /**
   * Start the game (FR-23). Transitions from 'lobby' to 'active'.
   *
   * @param {number} questionSetId
   * @param {Array} questions — ordered array of question objects from DB
   * @param {object} scoringConfig — from question_sets.scoring_config
   * @returns {{ success: boolean, error?: string }}
   */
  startGame(questionSetId, questions, scoringConfig) {
    if (this.status !== 'lobby') {
      return { success: false, error: 'Game can only be started from lobby state.' };
    }

    if (this.participants.size === 0) {
      return { success: false, error: 'Cannot start game with no participants.' };
    }

    this.status = 'active';
    this.questionSetId = questionSetId;
    this.questions = questions;
    this.currentQuestionIndex = -1; // host must launch first question
    this.currentQuestion = null;
    this.gameStartedAt = new Date().toISOString();
    this.loadScoringConfig(scoringConfig);

    return { success: true };
  }

  /**
   * Launch the next question (FR-25, FR-26).
   *
   * @returns {{ question: object, questionNumber: number, total: number }|null}
   */
  launchNextQuestion() {
    // Clean up any previous timer
    if (this.timerState.intervalId) {
      clearInterval(this.timerState.intervalId);
      this.timerState.intervalId = null;
    }

    this.currentQuestionIndex++;
    if (this.currentQuestionIndex >= this.questions.length) {
      return null; // no more questions
    }

    this.currentQuestion = this.questions[this.currentQuestionIndex];
    this.answers.clear();
    this.answerCount = 0;
    this._answerWindowOpen = true;

    // Reset per-question flags
    for (const participant of this.participants.values()) {
      participant.answeredCurrentQuestion = false;
    }

    // Setup timer (FR-26)
    this.timerState = {
      total: this.currentQuestion.timer_seconds,
      remaining: this.currentQuestion.timer_seconds,
      paused: false,
      intervalId: null,
      questionLaunchedAt: Date.now()
    };

    return {
      question: this.currentQuestion,
      questionNumber: this.currentQuestionIndex + 1,
      total: this.questions.length
    };
  }

  /**
   * Submit an answer for the current question (FR-40, FR-41).
   *
   * Enforces: answer window open, first-submission-only, timer cutoff,
   * paused-timer block. Uses server-side timestamp for speed bonus accuracy.
   *
   * @param {string} socketId
   * @param {object} data — { questionId, answer }
   * @returns {{ success: boolean, error?: string, result?: object }}
   */
  submitAnswer(socketId, { questionId, answer }) {
    const participant = this.participants.get(socketId);
    if (!participant) {
      return { success: false, error: 'Participant not found.' };
    }

    // Guard: answer window must be open
    if (!this._answerWindowOpen) {
      return { success: false, error: 'Answer window is closed.' };
    }

    // Validate question ID matches current question
    if (!this.currentQuestion || this.currentQuestion.id !== questionId) {
      return { success: false, error: 'Invalid question.' };
    }

    // Block if timer is paused (locked requirement)
    if (this.timerState.paused) {
      return { success: false, error: 'Timer is paused. Submissions are blocked.' };
    }

    // Block if timer has expired (FR-27, FR-41) — hard cutoff
    if (this.timerState.remaining <= 0) {
      return { success: false, error: 'Time is up. Answer rejected.' };
    }

    // First submission only (FR-40)
    if (participant.answeredCurrentQuestion) {
      return { success: false, error: 'Answer already submitted.' };
    }

    // ── Mark as answered ──
    participant.answeredCurrentQuestion = true;

    // Server-side timestamp for speed bonus accuracy (don't trust client clock)
    const serverTimestamp = Date.now();
    const elapsedMs = serverTimestamp - this.timerState.questionLaunchedAt;
    // Compute the server-authoritative "remaining" at submission time
    // accounting for any pauses that may have occurred
    const serverRemaining = Math.max(0, this.timerState.remaining);

    // Determine correctness (FR-15: case-insensitive, trimmed, exact match)
    const isCorrect = this._checkAnswer(answer, this.currentQuestion);

    // Calculate score via the isolated scoring engine
    let pointsEarned = 0;
    let breakdown = null;

    if (isCorrect) {
      const result = calculateScore(
        serverRemaining,
        this.timerState.total,
        participant.streak,
        this.scoringConfig
      );
      pointsEarned = result.finalScore;
      breakdown = result.breakdown;
      participant.score += pointsEarned;
      participant.streak += 1;
      if (participant.streak > participant.bestStreak) {
        participant.bestStreak = participant.streak;
      }
    } else {
      // Wrong answer resets streak (FR-39)
      participant.streak = 0;
    }

    // Track answer time for tie-breaking (locked requirement)
    const answerTimeMs = Math.round(elapsedMs);
    if (isCorrect) {
      participant.totalAnswerTimeMs += answerTimeMs;
      participant.correctAnswerCount += 1;
    }

    // Store answer data for this question
    const answerData = {
      answer,
      timestamp: serverTimestamp,
      pointsEarned,
      isCorrect,
      breakdown
    };
    this.answers.set(participant.id, answerData);
    this.answerCount++;

    // Recalculate ranks after every submission
    this.recalculateRanks();

    return {
      success: true,
      result: {
        isCorrect,
        pointsEarned,
        breakdown,
        totalScore: participant.score,
        rank: participant.rank,
        streak: participant.streak
      }
    };
  }

  /**
   * Check if an answer is correct (FR-15 — case-insensitive, trimmed, exact match).
   */
  _checkAnswer(answer, question) {
    const submitted = String(answer).trim().toLowerCase();
    const correct = String(question.correct_answer).trim().toLowerCase();
    return submitted === correct;
  }

  // ──────────────────────────────────────────────
  // Ranking (tie-break by fastest avg answer time — locked req)
  // ──────────────────────────────────────────────

  /**
   * Recalculate ranks for all participants.
   * Primary sort: score (desc). Tie-break: average answer time (asc).
   */
  recalculateRanks() {
    const sorted = Array.from(this.participants.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tie-break: faster average answer time wins
      const avgA = a.correctAnswerCount > 0
        ? a.totalAnswerTimeMs / a.correctAnswerCount
        : Infinity;
      const avgB = b.correctAnswerCount > 0
        ? b.totalAnswerTimeMs / b.correctAnswerCount
        : Infinity;
      return avgA - avgB;
    });

    sorted.forEach((p, index) => {
      p.rank = index + 1;
    });
  }

  // ──────────────────────────────────────────────
  // Timer Management (FR-26, FR-27, FR-66)
  // ──────────────────────────────────────────────

  /**
   * Start the countdown timer for the current question.
   * The timer ticks every second on the server and calls onTick.
   * When it hits zero, it hard-closes the answer window (FR-27) and calls onExpire.
   *
   * @param {function} onTick — called every second with { remaining }
   * @param {function} onExpire — called when timer reaches 0
   */
  startTimer(onTick, onExpire) {
    if (this.timerState.intervalId) {
      clearInterval(this.timerState.intervalId);
    }

    this.timerState.intervalId = setInterval(() => {
      if (this.timerState.paused) return;

      this.timerState.remaining--;

      if (onTick) onTick({ remaining: this.timerState.remaining });

      if (this.timerState.remaining <= 0) {
        // ── FR-27: Hard-close answer window ──
        this._answerWindowOpen = false;
        clearInterval(this.timerState.intervalId);
        this.timerState.intervalId = null;
        if (onExpire) onExpire();
      }
    }, 1000);
  }

  /**
   * Pause the timer (FR-66). Submissions are blocked while paused.
   * @returns {{ remaining: number }}
   */
  pauseTimer() {
    this.timerState.paused = true;
    return { remaining: this.timerState.remaining };
  }

  /**
   * Resume the timer (FR-66).
   * @returns {{ remaining: number }}
   */
  resumeTimer() {
    this.timerState.paused = false;
    return { remaining: this.timerState.remaining };
  }

  /**
   * Force-close the answer window early (FR-28).
   * Called when host skips remaining time or skips the question entirely.
   */
  closeAnswerWindow() {
    this._answerWindowOpen = false;
    this.timerState.remaining = 0;
    if (this.timerState.intervalId) {
      clearInterval(this.timerState.intervalId);
      this.timerState.intervalId = null;
    }
  }

  // ──────────────────────────────────────────────
  // Answer Reveal & Leaderboard
  // ──────────────────────────────────────────────

  /**
   * Get the answer distribution for the current question (FR-49).
   * Groups by answer option with count per option.
   * Also reports the number of participants who didn't answer.
   */
  getAnswerDistribution() {
    const distribution = {};
    let noAnswerCount = 0;

    // Count submitted answers by option
    for (const answerData of this.answers.values()) {
      const key = String(answerData.answer);
      distribution[key] = (distribution[key] || 0) + 1;
    }

    // Count participants who didn't answer
    noAnswerCount = this.participants.size - this.answerCount;

    return {
      distribution,
      noAnswerCount,
      totalParticipants: this.participants.size,
      totalAnswered: this.answerCount
    };
  }

  /**
   * Get per-participant score update payloads for the answer reveal (FR-57).
   * Returns a Map of socketId → score update data.
   *
   * Includes: correct/incorrect indicator, points earned, breakdown
   * (base + speed bonus + streak multiplier), updated running total, rank.
   */
  getParticipantScoreUpdates() {
    const updates = new Map();

    for (const [socketId, participant] of this.participants.entries()) {
      const answerData = this.answers.get(participant.id);

      updates.set(socketId, {
        isCorrect: answerData?.isCorrect ?? false,
        answered: !!answerData,
        points: answerData?.pointsEarned ?? 0,
        breakdown: answerData?.breakdown ?? null,
        totalScore: participant.score,
        rank: participant.rank,
        streak: participant.streak,
        bestStreak: participant.bestStreak
      });
    }

    return updates;
  }

  /**
   * Get leaderboard data for top N participants (FR-43).
   * @param {number} topN — default 10
   */
  getLeaderboard(topN = 10) {
    this.recalculateRanks();
    return Array.from(this.participants.values())
      .sort((a, b) => a.rank - b.rank)
      .slice(0, topN)
      .map(p => ({
        rank: p.rank,
        name: p.name,
        section: p.section,
        score: p.score,
        streak: p.streak
      }));
  }

  /**
   * Get podium data — top 5 (FR-44).
   */
  getPodium() {
    return this.getLeaderboard(5);
  }

  /**
   * Get participant count (active + disconnected within grace period).
   */
  getParticipantCount() {
    return this.participants.size + this.disconnectedParticipants.size;
  }

  /**
   * Get serializable participant list for lobby display.
   */
  getParticipantList() {
    return Array.from(this.participants.values()).map(p => ({
      id: p.id,
      name: p.name,
      section: p.section,
      avatar: p.avatar,
      accentColor: p.accentColor
    }));
  }

  /**
   * Build the final results for persisting to Supabase (FR-05).
   */
  getFinalResults() {
    this.recalculateRanks();
    return Array.from(this.participants.values()).map(p => ({
      participant_name: p.name,
      section_year: p.section,
      avatar: p.avatar,
      accent_color: p.accentColor,
      final_score: p.score,
      final_rank: p.rank,
      best_streak: p.bestStreak,
      avg_answer_time_ms: p.correctAnswerCount > 0
        ? Math.round(p.totalAnswerTimeMs / p.correctAnswerCount)
        : 0
    }));
  }

  /**
   * End the game (FR-33).
   */
  endGame() {
    this.status = 'ended';
    this._answerWindowOpen = false;
    if (this.timerState.intervalId) {
      clearInterval(this.timerState.intervalId);
      this.timerState.intervalId = null;
    }
    this.recalculateRanks();
  }

  /**
   * Check if all participants have answered the current question.
   */
  allAnswersIn() {
    const activeCount = this.participants.size;
    return activeCount > 0 && this.answerCount >= activeCount;
  }

  /**
   * Get the live answer count for the host dashboard (FR-69).
   */
  getAnswerStatus() {
    const total = this.participants.size;
    return {
      answered: this.answerCount,
      total,
      percentage: total > 0 ? Math.round((this.answerCount / total) * 100) : 0
    };
  }

  /**
   * Check if there are more questions remaining.
   */
  hasMoreQuestions() {
    return this.currentQuestionIndex + 1 < this.questions.length;
  }

  /**
   * Get the next question preview data for the host (FR-24).
   * Returns null if no more questions.
   */
  getNextQuestionPreview() {
    const nextIndex = this.currentQuestionIndex + 1;
    if (nextIndex >= this.questions.length) return null;

    const q = this.questions[nextIndex];
    return {
      question: q.text,
      type: q.type,
      options: q.options,
      answer: q.correct_answer,
      timer: q.timer_seconds,
      image: q.image_url,
      questionNumber: nextIndex + 1,
      totalQuestions: this.questions.length
    };
  }

  /**
   * Get the current question preview for the host (FR-24).
   */
  getCurrentQuestionPreview() {
    if (!this.currentQuestion) return null;
    const q = this.currentQuestion;
    return {
      question: q.text,
      type: q.type,
      options: q.options,
      answer: q.correct_answer,
      timer: q.timer_seconds,
      image: q.image_url,
      questionNumber: this.currentQuestionIndex + 1,
      totalQuestions: this.questions.length
    };
  }
}

// Singleton — single room model (C-05)
module.exports = new GameStateManager();
