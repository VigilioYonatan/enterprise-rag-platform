import { expect, test } from '@playwright/test';
import { loginViaKeycloakPkce, logoutFromConsole, navigateAppSection } from './helpers';

const seedOwnerEmail = process.env.E2E_SEED_OWNER_EMAIL;
const seedAdminEmail = process.env.E2E_SEED_ADMIN_EMAIL;
const seedDemoPassword = process.env.E2E_SEED_DEMO_PASSWORD;

test.describe('Seeded Enterprise Workspace Verification (DDD Seeder + RLS + Citations + Baseline Eval)', () => {
  test.skip(
    !seedOwnerEmail || !seedAdminEmail || !seedDemoPassword,
    'Requires live E2E_SEED_OWNER_EMAIL, E2E_SEED_ADMIN_EMAIL, and E2E_SEED_DEMO_PASSWORD',
  );

  test('verifies seeded KBs, private ACL documents, hybrid 1024d search, RLS conversation isolation, evaluations, FinOps, and groups', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const isMobile = testInfo.project.name.includes('mobile');
    const actorEmail = (isMobile ? seedAdminEmail : seedOwnerEmail) ?? '';
    const actorPassword = seedDemoPassword ?? '';

    await loginViaKeycloakPkce(page, actorEmail, actorPassword);

    // 1. Dashboard summary reflects seeded tenant
    await expect(page.getByText(/Organizaciones accesibles:/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Arquitectura Zero Trust activa')).toBeVisible();

    // 2. Knowledge Hub shows seeded tenant & both KBs
    await navigateAppSection(page, 'Bibliotecas');
    await expect(page.getByRole('heading', { level: 1, name: 'Bases de conocimiento' })).toBeVisible();
    await page.locator('#tenant-choice').selectOption({ label: 'Atlas Corporación Financiera — Demo' });
    await expect(
      page.getByRole('link', { name: /Normativa de Ciberseguridad y Zero Trust 2026/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Arquitectura Financiera y FinOps IA/i })).toBeVisible();

    // 3. Open Security KB and verify both public-tenant & private CSIRT documents are visible to owner/admin
    await page.getByRole('link', { name: /Normativa de Ciberseguridad y Zero Trust 2026/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Documentos' })).toBeVisible();
    await expect(
      page.getByText('Política Corporativa de Control de Acceso Zero Trust y RLS 2026'),
    ).toBeVisible();
    await expect(page.getByText('Runbook Confidencial CSIRT — Cuarentena ClamAV y RustFS')).toBeVisible();

    // 4. Hybrid FTS + 1024d pgvector search over seeded vectors
    await navigateAppSection(page, 'Búsqueda y respuesta');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Búsqueda y respuesta con evidencias' }),
    ).toBeVisible();
    await page.locator('#tenant-s').selectOption({ label: 'Atlas Corporación Financiera — Demo' });
    await page.locator('#kb-s').selectOption({ label: 'Normativa de Ciberseguridad y Zero Trust 2026' });
    await page.getByRole('button', { name: /Solo búsqueda híbrida/i }).click();
    await page.getByLabel('Términos o consulta semántica').fill('FORCE ROW LEVEL SECURITY Keycloak');
    await page.getByRole('button', { name: 'Buscar fragmentos' }).click();
    await expect(
      page.getByRole('heading', { name: /Fragmentos (autorizados|recuperados) \([1-9]\d*\)/ }),
    ).toBeVisible({
      timeout: 25_000,
    });

    // 5. Conversations: Owner sees seeded conversation & live-resolved citations; Admin sees RLS isolation
    await navigateAppSection(page, 'Conversaciones');
    await expect(page.getByRole('heading', { level: 1, name: 'Conversaciones con evidencia' })).toBeVisible();
    await page.locator('#chat-tenant').selectOption({ label: 'Atlas Corporación Financiera — Demo' });
    await page.locator('#chat-kb').selectOption({ label: 'Normativa de Ciberseguridad y Zero Trust 2026' });

    if (!isMobile) {
      await page.getByRole('link', { name: /Auditoría de Controles RLS y Validez de Citas OIDC/i }).click();
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: 'Auditoría de Controles RLS y Validez de Citas OIDC',
        }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: /\[1\] Política Corporativa de Control de Acceso Zero Trust/i })
        .click();
      const expandCitationBtn = page.getByRole('button', { name: /Ampliar/i });
      await expect(expandCitationBtn).toBeVisible({ timeout: 15_000 });
      await expandCitationBtn.click();
      await expect(
        page.getByText('Fragmento verificado contra políticas RLS y versión documental vigente'),
      ).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    } else {
      await expect(page.getByText('Sin conversaciones')).toBeVisible();
    }

    // 6. Evaluations: Verify seeded dataset & baseline run inspection
    await navigateAppSection(page, 'Evaluaciones');
    await expect(page.getByRole('heading', { level: 1, name: 'Evaluación de retrieval' })).toBeVisible();
    await page.locator('#eval-tenant').selectOption({ label: 'Atlas Corporación Financiera — Demo' });
    await expect(page.getByRole('button', { name: 'Inspeccionar' }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Inspeccionar' }).first().click();
    await expect(page.getByRole('heading', { name: /Resultados por caso/i })).toBeVisible({
      timeout: 15_000,
    });

    // 7. Operations & Security seeded telemetry
    await navigateAppSection(page, 'Uso y auditoría');
    await expect(page.getByRole('heading', { level: 1, name: 'Uso, DLQ y gobierno' })).toBeVisible();
    await page.locator('#ops-tenant').selectOption({ label: 'Atlas Corporación Financiera — Demo' });
    await expect(page.getByRole('button', { name: /^Ver evento / }).first()).toBeVisible({
      timeout: 15_000,
    });

    await navigateAppSection(page, 'Identidad');
    await expect(page.getByRole('heading', { level: 1, name: 'Miembros y grupos' })).toBeVisible();
    await page.locator('#security-tenant').selectOption({ label: 'Atlas Corporación Financiera — Demo' });
    await expect(page.getByText('owner.demo@atlas.local').first()).toBeVisible();
    await expect(page.getByText('viewer.demo@atlas.local').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Comité de Seguridad CSIRT/i })).toBeVisible();

    await logoutFromConsole(page);
  });
});
