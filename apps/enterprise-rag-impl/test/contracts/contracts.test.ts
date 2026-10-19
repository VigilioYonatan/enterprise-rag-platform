import { describe, expect, it } from 'vitest';
import {
  createTextDocumentRequestDto,
  searchKnowledgeRequestDto,
} from '../../src/modules/knowledge/presentation/http/dto/knowledge.dto';
import { buildPaginatedPayload } from '../../src/shared/http/dto/paginator.dto';

describe('HTTP request contracts', () => {
  it('rejects oversized text', () =>
    expect(
      createTextDocumentRequestDto.safeParse({ title: 'x', text: 'a'.repeat(100001), visibility: 'private' })
        .success,
    ).toBe(false));
  it('rejects unknown privilege input', () =>
    expect(
      createTextDocumentRequestDto.safeParse({
        title: 'x',
        text: 'hi',
        visibility: 'tenant',
        owner_sub: 'attacker',
      }).success,
    ).toBe(false));
  it('validates a knowledge-base UUID', () =>
    expect(searchKnowledgeRequestDto.safeParse({ knowledge_base_id: 'wrong', query: 'hello' }).success).toBe(
      false,
    ));

  it('builds paginator response with object input and next page', () => {
    const page = buildPaginatedPayload({
      path: '/api/v1/documents',
      results: [{ id: '1' }, { id: '2' }],
      count: 10,
      limit: 2,
      offset: 0,
      extraQuery: { search: 'rag' },
    });
    expect(page.count).toBe(10);
    expect(page.previous).toBeNull();
    expect(page.next).toBe('/api/v1/documents?search=rag&limit=2&offset=2');
    expect(page.results).toHaveLength(2);
  });

  it('builds paginator response with positional arguments on middle and last pages', () => {
    const middlePage = buildPaginatedPayload('/api/v1/documents', [{ id: '3' }], 10, 2, 4);
    expect(middlePage.previous).toBe('/api/v1/documents?limit=2&offset=2');
    expect(middlePage.next).toBe('/api/v1/documents?limit=2&offset=6');

    const lastPage = buildPaginatedPayload('/api/v1/documents', [{ id: '9' }, { id: '10' }], 10, 2, 8);
    expect(lastPage.previous).toBe('/api/v1/documents?limit=2&offset=6');
    expect(lastPage.next).toBeNull();
  });
});
