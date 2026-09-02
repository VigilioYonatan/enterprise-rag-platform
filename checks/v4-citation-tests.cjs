#!/usr/bin/env node
/**
 * Citation Quality & Extraction Pure Tests
 * Validates citation parsing, range assertions, and hallucination detection.
 */
const assert = require('node:assert');

function extractCitations(answerText, validSourceIndices = [1, 2, 3]) {
  const citationRegex = /\[(\d+)\]/g;
  const found = new Set();
  let match;
  while ((match = citationRegex.exec(answerText)) !== null) {
    found.add(parseInt(match[1], 10));
  }
  const citations = Array.from(found).sort((a, b) => a - b);
  const hallucinated = citations.filter((c) => !validSourceIndices.includes(c));
  return { citations, hallucinated };
}

const answer1 = 'El límite de presupuesto es 1000 USD [1]. Los eventos de outbox se envían a BullMQ [2].';
const result1 = extractCitations(answer1, [1, 2]);
assert.deepStrictEqual(result1.citations, [1, 2]);
assert.deepStrictEqual(result1.hallucinated, []);

const answer2 = 'Información no respaldada [99].';
const result2 = extractCitations(answer2, [1, 2]);
assert.deepStrictEqual(result2.citations, [99]);
assert.deepStrictEqual(result2.hallucinated, [99]);

console.log('v4 Citation pure tests: PASS (citation extraction and hallucination detection verified)');
