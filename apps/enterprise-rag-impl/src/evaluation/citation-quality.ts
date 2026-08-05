/**
 * Deterministic, conservative citation STRUCTURE verification.
 * This is not natural-language entailment, factual truth, or an LLM-as-judge.
 * It prevents delivery of a generated answer containing uncited factual lines,
 * out-of-range citation indices or malformed evidence references.
 * Semantic faithfulness must be judged independently against the source text.
 */
export interface CitationStructureResult {
  valid: boolean;
  claim_count: number;
  supported_claim_count: number;
  citation_coverage: number;
  cited_indices: number[];
  invalid_indices: number[];
  uncited_claims: number;
}

const REFERENCES = /\[(\d{1,4})\]/g;
const SENTENCES = /(?<=[.!?])\s+(?=[\p{Lu}\p{N}\-*])/u;

export function evaluateCitationStructure(output: string, availableSources: number): CitationStructureResult {
  if (!Number.isSafeInteger(availableSources) || availableSources < 0 || availableSources > 1000) {
    throw new Error('Invalid source count');
  }
  const text = output.trim();
  const found = [...text.matchAll(REFERENCES)].map((match) => Number(match[1]));
  const cited_indices = [...new Set(found.filter((index) => index >= 1 && index <= availableSources))].sort(
    (a, b) => a - b,
  );
  const invalid_indices = [...new Set(found.filter((index) => index < 1 || index > availableSources))].sort(
    (a, b) => a - b,
  );
  const clauses = text
    .split(/\r?\n/)
    .flatMap((line) => line.split(SENTENCES))
    .map((clause) => clause.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((clause) => clause.length > 0 && !/^#{1,6}\s/.test(clause));
  let supported = 0;
  for (const clause of clauses) {
    const references = [...clause.matchAll(REFERENCES)].map((match) => Number(match[1]));
    if (references.length > 0 && references.every((index) => index >= 1 && index <= availableSources))
      supported++;
  }
  const claim_count = clauses.length;
  return {
    valid:
      claim_count > 0 &&
      cited_indices.length > 0 &&
      invalid_indices.length === 0 &&
      supported === claim_count,
    claim_count,
    supported_claim_count: supported,
    citation_coverage: claim_count ? supported / claim_count : 0,
    cited_indices,
    invalid_indices,
    uncited_claims: claim_count - supported,
  };
}

/** Token-overlap is a diagnostic indicator ONLY; it must not be labelled factual groundedness. */
export function lexicalEvidenceOverlap(claim: string, sources: string[]): number {
  const normalize = (text: string) => text.toLocaleLowerCase('es').match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const tokens = new Set(normalize(claim.replace(REFERENCES, '')));
  if (tokens.size === 0 || sources.length === 0) return 0;
  const evidence = new Set(sources.flatMap(normalize));
  let matches = 0;
  for (const token of tokens) if (evidence.has(token)) matches++;
  return matches / tokens.size;
}
