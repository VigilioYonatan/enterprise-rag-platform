import { describe, expect, it } from 'vitest';
import {
  askQuestionRequestDto,
  createKnowledgeBaseRequestDto,
  createTenantRequestDto,
  createTextDocumentRequestDto,
  searchKnowledgeRequestDto,
} from '../../src/modules/knowledge/presentation/http/dto/knowledge.dto';

const KB = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
describe('Zod contract boundary', () => {
  it('accepts correct normalized tenant name', () => {
    expect(createTenantRequestDto.parse({ name: '  Engineering  ' })).toEqual({ name: 'Engineering' });
  });
  it('refuses unknown fields and short tenant names', () => {
    expect(createTenantRequestDto.safeParse({ name: 'A', admin: true }).success).toBe(false);
  });
  it('rejects bad UUID and missing base name', () => {
    expect(createKnowledgeBaseRequestDto.safeParse({ tenant_id: 'bad', name: 'x' }).success).toBe(false);
  });
  it('defaults text documents to private visibility', () => {
    expect(createTextDocumentRequestDto.parse({ title: 'Source', text: 'content' }).visibility).toBe(
      'private',
    );
  });
  it('rejects oversized UTF8 documents', () => {
    expect(createTextDocumentRequestDto.safeParse({ title: 'A', text: '😀'.repeat(30000) }).success).toBe(
      false,
    );
  });
  it('rejects unknown properties on search', () => {
    expect(
      searchKnowledgeRequestDto.safeParse({ knowledge_base_id: KB, query: 'policy', tenant_id: KB }).success,
    ).toBe(false);
  });
  it('enforces question length', () => {
    expect(askQuestionRequestDto.safeParse({ knowledge_base_id: KB, question: 'x' }).success).toBe(false);
  });
});
