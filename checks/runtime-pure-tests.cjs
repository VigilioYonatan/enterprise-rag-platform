#!/usr/bin/env node
/**
 * Pure Runtime Logic Tests
 * Executes unit-level business logic assertions in isolation from external services.
 */
const assert = require('node:assert');
const crypto = require('node:crypto');

// 1. FinOps budget validation
function calculateCostUsd(promptTokens, completionTokens, promptRatePerMillion = 0.5, completionRatePerMillion = 1.5) {
  const promptCost = (promptTokens / 1_000_000) * promptRatePerMillion;
  const completionCost = (completionTokens / 1_000_000) * completionRatePerMillion;
  return Number((promptCost + completionCost).toFixed(6));
}

const cost = calculateCostUsd(1000, 500);
assert.strictEqual(cost, 0.00125);
assert.strictEqual(calculateCostUsd(0, 0), 0);

// 2. Safe chunk hashing
function computeChunkHash(text, ordinal) {
  return crypto.createHash('sha256').update(`${ordinal}:${text}`).digest('hex');
}
const h1 = computeChunkHash('Enterprise document chunk', 0);
const h2 = computeChunkHash('Enterprise document chunk', 1);
assert.notStrictEqual(h1, h2);
assert.strictEqual(h1, computeChunkHash('Enterprise document chunk', 0));

// 3. ClamAV protocol response parsing
function parseClamResponse(responseString) {
  const trimmed = responseString.trim();
  if (trimmed.endsWith('OK')) {
    return { clean: true, malware: null };
  }
  const match = trimmed.match(/stream:\s*(.+?)\s*FOUND/i);
  if (match) {
    return { clean: false, malware: match[1].trim() };
  }
  return { clean: false, malware: 'UNKNOWN_SCAN_ERROR' };
}

assert.deepStrictEqual(parseClamResponse('stream: OK\n'), { clean: true, malware: null });
assert.deepStrictEqual(parseClamResponse('stream: Eicar-Test-Signature FOUND\n'), {
  clean: false,
  malware: 'Eicar-Test-Signature',
});

console.log('Runtime pure tests: PASS (3/3 business logic invariants verified)');
