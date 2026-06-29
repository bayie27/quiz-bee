#!/usr/bin/env node

const { performance } = require('perf_hooks');

let io;
try {
  ({ io } = require('socket.io-client'));
} catch {
  ({ io } = require('../client/node_modules/socket.io-client'));
}

const DEFAULTS = {
  url: process.env.LOADTEST_URL || 'http://localhost:3001',
  users: 1000,
  pin: process.env.LOADTEST_ROOM_PIN || '000000',
  joinRate: 100,
  joinIntervalMs: 1000,
  connectTimeoutMs: 20000,
  holdSeconds: 120,
  answerMinMs: 250,
  answerMaxMs: 5000,
  answerMode: 'random',
  fixedAnswer: 'A',
  sectionPrefix: 'LOAD',
  namePrefix: 'Load Student',
  transports: 'websocket'
};

const rawArgs = process.argv.slice(2);
const argv = { ...parseNpmConfigArgs(process.env), ...parsePositionalArgs(rawArgs), ...parseArgs(rawArgs) };
const config = normalizeConfig({ ...DEFAULTS, ...argv });
const clients = [];
const metrics = {
  connectLatencies: [],
  joinLatencies: [],
  answerLatencies: [],
  questionReceiveCount: 0,
  answerAttempts: 0,
  lockedAnswers: 0,
  connectErrors: new Map(),
  joinErrors: new Map(),
  answerErrors: new Map(),
  disconnects: new Map(),
  questions: new Map(),
  startedAt: Date.now()
};

main().catch((err) => {
  console.error('[loadtest] fatal:', err);
  cleanup();
  process.exit(1);
});

async function main() {
  console.log('[loadtest] participant simulator');
  console.log(`[loadtest] target=${config.url} users=${config.users} pin=${config.pin}`);
  console.log(`[loadtest] joinRate=${config.joinRate}/${config.joinIntervalMs}ms hold=${config.holdSeconds}s`);
  console.log('[loadtest] start the host and launch questions manually while this is running.');

  process.once('SIGINT', () => {
    console.log('\n[loadtest] interrupted');
    finish(130);
  });

  await joinParticipants();

  const joined = clients.filter((client) => client.joined).length;
  console.log(`[loadtest] join phase complete: ${joined}/${config.users} joined`);

  await wait(config.holdSeconds * 1000);
  finish(joined === config.users && metrics.answerErrors.size === 0 ? 0 : 1);
}

async function joinParticipants() {
  for (let start = 0; start < config.users; start += config.joinRate) {
    const end = Math.min(start + config.joinRate, config.users);
    const batch = [];

    for (let index = start; index < end; index++) {
      batch.push(createParticipant(index));
    }

    await Promise.all(batch);

    const joined = clients.filter((client) => client.joined).length;
    const failed = sumMap(metrics.joinErrors) + sumMap(metrics.connectErrors);
    console.log(`[loadtest] joined=${joined} failed=${failed} activeSockets=${clients.length}`);

    if (end < config.users) {
      await wait(config.joinIntervalMs);
    }
  }
}

function createParticipant(index) {
  return new Promise((resolve) => {
    const connectStartedAt = performance.now();
    const participant = {
      index,
      name: `${config.namePrefix} ${String(index + 1).padStart(4, '0')}`,
      section: `${config.sectionPrefix}-${(index % 20) + 1}`,
      socket: null,
      joined: false,
      participantId: null,
      sessionToken: null,
      currentQuestionId: null
    };

    const socket = io(config.url, {
      transports: config.transports.split(','),
      timeout: config.connectTimeoutMs,
      reconnection: false,
      forceNew: true
    });

    participant.socket = socket;
    clients.push(participant);

    const settle = once(resolve);

    socket.on('connect', () => {
      metrics.connectLatencies.push(performance.now() - connectStartedAt);
      const joinStartedAt = performance.now();

      socket.emit('participant:join', {
        name: participant.name,
        section: participant.section,
        pin: config.pin,
        avatar: { shape: 'circle', color: 'red' }
      });

      socket.once('join:success', (payload) => {
        participant.joined = true;
        participant.participantId = payload.participantId;
        participant.sessionToken = payload.sessionToken;
        metrics.joinLatencies.push(performance.now() - joinStartedAt);
        settle();
      });

      socket.once('join:error', ({ reason }) => {
        increment(metrics.joinErrors, reason || 'unknown join error');
        socket.disconnect();
        settle();
      });
    });

    socket.on('connect_error', (err) => {
      increment(metrics.connectErrors, err.message || 'unknown connect error');
      settle();
    });

    socket.on('disconnect', (reason) => {
      increment(metrics.disconnects, reason || 'unknown disconnect');
    });

    socket.on('question:live', (question) => {
      if (!participant.joined || participant.currentQuestionId === question.questionId) return;
      participant.currentQuestionId = question.questionId;
      metrics.questionReceiveCount++;
      incrementQuestion(question.questionId, 'received');

      const delay = randomInt(config.answerMinMs, config.answerMaxMs);
      setTimeout(() => submitAnswer(participant, question), delay);
    });

    socket.on('answer:error', ({ reason }) => {
      increment(metrics.answerErrors, reason || 'unknown answer error');
    });
  });
}

function submitAnswer(participant, question) {
  if (!participant.joined || !participant.socket.connected) return;

  const answer = pickAnswer(question);
  const startedAt = performance.now();
  metrics.answerAttempts++;
  incrementQuestion(question.questionId, 'attempted');

  participant.socket.emit('participant:answer', {
    questionId: question.questionId,
    answer
  });

  participant.socket.once('answer:locked', ({ questionId }) => {
    if (questionId !== question.questionId) return;
    metrics.lockedAnswers++;
    metrics.answerLatencies.push(performance.now() - startedAt);
    incrementQuestion(question.questionId, 'locked');
  });
}

function pickAnswer(question) {
  if (config.answerMode === 'fixed') return config.fixedAnswer;

  if (Array.isArray(question.options) && question.options.length > 0) {
    const option = question.options[randomInt(0, question.options.length - 1)];
    return option.label || option.text || config.fixedAnswer;
  }

  return config.fixedAnswer;
}

function finish(exitCode) {
  printReport();
  cleanup();
  process.exit(exitCode);
}

function printReport() {
  const joined = clients.filter((client) => client.joined).length;
  const connected = clients.filter((client) => client.socket.connected).length;
  const runtimeSeconds = ((Date.now() - metrics.startedAt) / 1000).toFixed(1);

  console.log('\n[loadtest] report');
  console.log(`runtimeSeconds=${runtimeSeconds}`);
  console.log(`participants.requested=${config.users}`);
  console.log(`participants.joined=${joined}`);
  console.log(`participants.connected=${connected}`);
  printLatency('connectLatencyMs', metrics.connectLatencies);
  printLatency('joinLatencyMs', metrics.joinLatencies);
  printLatency('answerLockLatencyMs', metrics.answerLatencies);
  console.log(`questions.receivedEvents=${metrics.questionReceiveCount}`);
  console.log(`answers.attempted=${metrics.answerAttempts}`);
  console.log(`answers.locked=${metrics.lockedAnswers}`);
  printMap('connectErrors', metrics.connectErrors);
  printMap('joinErrors', metrics.joinErrors);
  printMap('answerErrors', metrics.answerErrors);
  printMap('disconnects', metrics.disconnects);

  if (metrics.questions.size > 0) {
    console.log('questions.byId=' + JSON.stringify(Object.fromEntries(metrics.questions), null, 2));
  }
}

function printLatency(label, values) {
  const stats = percentileStats(values);
  console.log(`${label}.count=${stats.count}`);
  if (stats.count === 0) return;
  console.log(`${label}.p50=${stats.p50}`);
  console.log(`${label}.p95=${stats.p95}`);
  console.log(`${label}.p99=${stats.p99}`);
  console.log(`${label}.max=${stats.max}`);
}

function percentileStats(values) {
  if (values.length === 0) return { count: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: Math.round(percentile(sorted, 0.5)),
    p95: Math.round(percentile(sorted, 0.95)),
    p99: Math.round(percentile(sorted, 0.99)),
    max: Math.round(sorted[sorted.length - 1])
  };
}

function percentile(sorted, p) {
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1);
  return sorted[index];
}

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) continue;
    const key = toCamelCase(arg.slice(2));
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      i++;
    }
  }
  return parsed;
}

function parsePositionalArgs(args) {
  if (args.some((arg) => arg.startsWith('--'))) return {};
  const [users, url, pin, holdSeconds] = args;
  const parsed = {};
  if (users) parsed.users = users;
  if (url) parsed.url = url;
  if (pin) parsed.pin = pin;
  if (holdSeconds) parsed.holdSeconds = holdSeconds;
  return parsed;
}

function parseNpmConfigArgs(env) {
  const parsed = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('npm_config_') || value === 'true' || value === 'false') continue;
    const option = key.slice('npm_config_'.length).replace(/_/g, '-');
    if (option in DEFAULTS || toCamelCase(option) in DEFAULTS) {
      parsed[toCamelCase(option)] = value;
    }
  }
  return parsed;
}

function normalizeConfig(raw) {
  return {
    ...raw,
    users: positiveInt(raw.users, 'users'),
    joinRate: positiveInt(raw.joinRate, 'join-rate'),
    joinIntervalMs: positiveInt(raw.joinIntervalMs, 'join-interval-ms'),
    connectTimeoutMs: positiveInt(raw.connectTimeoutMs, 'connect-timeout-ms'),
    holdSeconds: positiveInt(raw.holdSeconds, 'hold-seconds'),
    answerMinMs: positiveInt(raw.answerMinMs, 'answer-min-ms'),
    answerMaxMs: positiveInt(raw.answerMaxMs, 'answer-max-ms')
  };
}

function positiveInt(value, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return parsed;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function once(fn) {
  let called = false;
  return (...args) => {
    if (called) return;
    called = true;
    fn(...args);
  };
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function incrementQuestion(questionId, key) {
  const id = String(questionId);
  const current = metrics.questions.get(id) || {};
  current[key] = (current[key] || 0) + 1;
  metrics.questions.set(id, current);
}

function sumMap(map) {
  let total = 0;
  for (const value of map.values()) total += value;
  return total;
}

function printMap(label, map) {
  console.log(`${label}=${JSON.stringify(Object.fromEntries(map))}`);
}

function cleanup() {
  for (const client of clients) {
    client.socket.disconnect();
  }
}
