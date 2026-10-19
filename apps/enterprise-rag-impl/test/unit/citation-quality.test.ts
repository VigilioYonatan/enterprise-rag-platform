import { describe, expect, it } from 'vitest';
import { evaluateCitationStructure, lexicalEvidenceOverlap } from '../../src/evaluation/citation-quality';

describe('citation structure policy', () => {
  it('accepts each factual sentence with in-range citations', () => {
    const result = evaluateCitationStructure(
      'El acceso requiere un rol [1]. El documento tiene una versión [2].',
      2,
    );
    expect(result.valid).toBe(true);
    expect(result.citation_coverage).toBe(1);
    expect(result.cited_indices).toEqual([1, 2]);
  });
  it('abstains when a sentence is uncited even if another sentence is cited', () => {
    expect(evaluateCitationStructure('El acceso requiere un rol [1]. El archivo es público.', 2).valid).toBe(
      false,
    );
  });
  it('rejects missing, invalid and arbitrary references', () => {
    expect(evaluateCitationStructure('Afirmación [42].', 2).invalid_indices).toEqual([42]);
    expect(evaluateCitationStructure('Afirmación sin cita.', 2).valid).toBe(false);
    expect(evaluateCitationStructure('Afirmación [0].', 2).valid).toBe(false);
  });
  it('does not claim semantic faithfulness based on lexical overlap', () => {
    expect(lexicalEvidenceOverlap('azules enormes [1]', ['enormes objetos azules'])).toBe(1);
    expect(lexicalEvidenceOverlap('imposible falsedad', ['evidencia real'])).toBe(0);
  });
});
