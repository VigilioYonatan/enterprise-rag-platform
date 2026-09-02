#!/usr/bin/env node
/**
 * v3 Runtime Pure Tests
 * Validates SSE parsing rules and retrieval metric computations.
 */
const assert = require('node:assert');

// 1. SSE event framing with CRLF normalization
function parseSseBuffer(buffer) {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const events = [];
  const blocks = normalized.split('\n\n');
  for (const block of blocks) {
    if (!block.trim()) continue;
    let eventName = 'message';
    let data = '';
    const lines = block.split('\n');
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data += (data ? '\n' : '') + line.slice(5).trim();
      }
    }
    events.push({ event: eventName, data });
  }
  return events;
}

const rawSse = 'event: token\r\ndata: {"text":"Hola"}\r\n\r\nevent: done\r\ndata: {"finish":true}\r\n\r\n';
const parsed = parseSseBuffer(rawSse);
assert.strictEqual(parsed.length, 2);
assert.strictEqual(parsed[0].event, 'token');
assert.deepStrictEqual(JSON.parse(parsed[0].data), { text: 'Hola' });
assert.strictEqual(parsed[1].event, 'done');

// 2. Retrieval metrics: Reciprocal Rank
function computeReciprocalRank(retrievedIds, groundTruthId) {
  const rank = retrievedIds.indexOf(groundTruthId);
  return rank === -1 ? 0 : 1 / (rank + 1);
}

assert.strictEqual(computeReciprocalRank(['doc-1', 'doc-2', 'doc-3'], 'doc-1'), 1.0);
assert.strictEqual(computeReciprocalRank(['doc-1', 'doc-2', 'doc-3'], 'doc-2'), 0.5);
assert.strictEqual(computeReciprocalRank(['doc-1', 'doc-2', 'doc-3'], 'doc-99'), 0);

console.log('v3 Runtime pure tests: PASS (SSE framing and reciprocal rank metrics verified)');
