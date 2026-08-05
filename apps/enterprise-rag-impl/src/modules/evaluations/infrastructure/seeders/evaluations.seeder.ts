import {
  evaluation_cases,
  evaluation_datasets,
  evaluation_results,
  evaluation_runs,
} from '../../../../database/schema';
import {
  deterministicSeedUuid,
  type SeedExecutionContext,
} from '../../../../shared/infrastructure/database/seeders/seed-types';

export class EvaluationsSeeder {
  constructor(private readonly ctx: SeedExecutionContext) {}

  async run(): Promise<void> {
    const { actors, ids } = this.ctx;
    const tenant_id = ids.tenant_id ?? ids.tenantId;
    const ns = `atlas-enterprise-seed-v6:${actors.owner.sub}`;
    const result1Id = deterministicSeedUuid(ns, 'eval-result:rls');
    const result2Id = deterministicSeedUuid(ns, 'eval-result:clamav');
    const result3Id = deterministicSeedUuid(ns, 'eval-result:abstention');

    await this.ctx.withActorDb(actors.owner.sub, async (db) => {
      await db
        .insert(evaluation_datasets)
        .values({
          id: ids.datasetId,
          tenant_id,
          knowledge_base_id: ids.securityKbId,
          created_by_sub: actors.owner.sub,
          name: 'Golden Set — Seguridad Zero Trust Q4',
          revision: 3,
        })
        .onConflictDoUpdate({
          target: evaluation_datasets.id,
          set: {
            name: 'Golden Set — Seguridad Zero Trust Q4',
            revision: 3,
          },
        });

      const cases: Array<{
        id: string;
        question: string;
        expected_docs: string[];
        expected_abstention: boolean;
      }> = [
        {
          id: ids.caseRlsId,
          question:
            '¿Qué mecanismo de PostgreSQL aplica aislamiento obligatorio por fila entre organizaciones?',
          expected_docs: [ids.zeroTrustDocId],
          expected_abstention: false,
        },
        {
          id: ids.caseClamavId,
          question: '¿Cuál es el protocolo CSIRT cuando ClamAV detecta malware en cuarentena?',
          expected_docs: [ids.incidentRunbookDocId],
          expected_abstention: false,
        },
        {
          id: ids.caseAbstentionId,
          question: '¿Cuáles son los códigos SWIFT privados del banco corresponsal externo en Zúrich?',
          expected_docs: [],
          expected_abstention: true,
        },
      ];

      for (const item of cases) {
        await db
          .insert(evaluation_cases)
          .values({
            id: item.id,
            dataset_id: ids.datasetId,
            question: item.question,
            expected_document_ids: item.expected_docs,
            expected_abstention: item.expected_abstention,
          })
          .onConflictDoNothing({ target: evaluation_cases.id });
      }

      const completedAt = new Date('2026-11-01T14:05:00.000Z');
      await db
        .insert(evaluation_runs)
        .values({
          id: ids.evalRunId,
          dataset_id: ids.datasetId,
          created_by_sub: actors.owner.sub,
          status: 'completed',
          dataset_revision: 3,
          recall_at_6: '1.00000',
          mrr_at_6: '1.00000',
          ndcg_at_6: '1.00000',
          precision_at_6: '0.75000',
          abstention_pass_rate: '1.00000',
          case_count: 3,
          started_at: new Date('2026-11-01T14:04:55.000Z'),
          completed_at: completedAt,
        })
        .onConflictDoUpdate({
          target: evaluation_runs.id,
          set: {
            status: 'completed',
            dataset_revision: 3,
            recall_at_6: '1.00000',
            mrr_at_6: '1.00000',
            ndcg_at_6: '1.00000',
            precision_at_6: '0.75000',
            abstention_pass_rate: '1.00000',
            case_count: 3,
            completed_at: completedAt,
          },
        });

      await db
        .insert(evaluation_results)
        .values([
          {
            id: result1Id,
            run_id: ids.evalRunId,
            case_id: ids.caseRlsId,
            recall_at_6: '1.00000',
            ndcg_at_6: '1.00000',
            precision_at_6: '1.00000',
            retrieved_document_ids: [ids.zeroTrustDocId],
            abstention_pass: null,
          },
          {
            id: result2Id,
            run_id: ids.evalRunId,
            case_id: ids.caseClamavId,
            recall_at_6: '1.00000',
            ndcg_at_6: '1.00000',
            precision_at_6: '1.00000',
            retrieved_document_ids: [ids.incidentRunbookDocId],
            abstention_pass: null,
          },
          {
            id: result3Id,
            run_id: ids.evalRunId,
            case_id: ids.caseAbstentionId,
            recall_at_6: '1.00000',
            ndcg_at_6: '1.00000',
            precision_at_6: '1.00000',
            retrieved_document_ids: [],
            abstention_pass: true,
          },
        ])
        .onConflictDoNothing();
    });
  }
}

export async function seedEvaluations(ctx: SeedExecutionContext): Promise<void> {
  await new EvaluationsSeeder(ctx).run();
}
