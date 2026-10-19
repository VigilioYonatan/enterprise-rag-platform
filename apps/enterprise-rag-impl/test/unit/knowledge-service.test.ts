import { describe, expect, it, vi } from 'vitest';
import type { KnowledgeRepositoryPort } from '../../src/modules/knowledge/application/ports/knowledge-repository.port';
import { KnowledgeService } from '../../src/modules/knowledge/application/services/knowledge.service';

describe('knowledge application service delegates to a port', () => {
  it('creates a knowledge base with the authenticated actor (not a body-supplied owner)', async () => {
    const repository = {
      createKnowledgeBase: vi.fn().mockResolvedValue({ id: '1', tenant_id: 't', name: 'Handbook' }),
    } as unknown as KnowledgeRepositoryPort;
    const service = new KnowledgeService(repository);
    const result = await service.createKnowledgeBase('actor-1', 'tenant-1', 'Handbook');
    expect(repository.createKnowledgeBase).toHaveBeenCalledWith('actor-1', 'tenant-1', 'Handbook');
    expect(result.name).toBe('Handbook');
  });

  it('delegates me, tenants, createTenant and knowledgeBases to repository', async () => {
    const repository = {
      me: vi.fn().mockResolvedValue({ sub: 'user-1', email: 'u1@corp.local', tenants: [] }),
      tenants: vi.fn().mockResolvedValue({ count: 1, rows: [{ id: 't1', name: 'Corp' }] }),
      createTenant: vi.fn().mockResolvedValue({ id: 't1', name: 'Corp' }),
      knowledgeBases: vi
        .fn()
        .mockResolvedValue({ count: 1, rows: [{ id: 'kb1', tenant_id: 't1', name: 'HR' }] }),
    } as unknown as KnowledgeRepositoryPort;
    const service = new KnowledgeService(repository);

    const meRes = await service.me({
      sub: 'user-1',
      email: 'u1@corp.local',
    });
    expect(meRes.sub).toBe('user-1');

    const tList = await service.tenants('user-1', { limit: 10, offset: 0 });
    expect(tList.count).toBe(1);

    const tCreated = await service.createTenant('user-1', 'Corp');
    expect(tCreated.id).toBe('t1');

    const kbList = await service.knowledgeBases('user-1', 't1');
    expect(kbList.count).toBe(1);
  });

  it('delegates update and delete knowledge bases, handling missing handlers gracefully', async () => {
    const repositoryWithHandlers = {
      updateKnowledgeBase: vi.fn().mockResolvedValue({ id: 'kb1', name: 'Updated' }),
      deleteKnowledgeBase: vi.fn().mockResolvedValue({ deleted: true }),
      documents: vi.fn().mockResolvedValue({ count: 0, rows: [] }),
      createDocument: vi.fn().mockResolvedValue({ id: 'doc1', title: 'Guide' }),
    } as unknown as KnowledgeRepositoryPort;
    const service = new KnowledgeService(repositoryWithHandlers);

    const updated = await service.updateKnowledgeBase('user-1', 'kb1', 'Updated');
    expect(updated.name).toBe('Updated');

    const deleted = await service.deleteKnowledgeBase('user-1', 'kb1');
    expect(deleted.deleted).toBe(true);

    const docs = await service.documents('user-1', 'kb1');
    expect(docs.count).toBe(0);

    const docCreated = await service.createDocument('user-1', 'kb1', 'Guide', 'text', 'tenant');
    expect(docCreated.id).toBe('doc1');

    // Test fallback error handling
    const bareRepo = {} as unknown as KnowledgeRepositoryPort;
    const bareService = new KnowledgeService(bareRepo);
    expect(() => bareService.updateKnowledgeBase('user-1', 'kb1', 'New')).toThrow();
    expect(() => bareService.deleteKnowledgeBase('user-1', 'kb1')).toThrow();
  });
});
