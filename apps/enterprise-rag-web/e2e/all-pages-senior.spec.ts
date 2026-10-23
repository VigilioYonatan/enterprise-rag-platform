import { expect, test } from '@playwright/test';
import { loginViaKeycloakPkce, logoutFromConsole, navigateAppSection } from './helpers';

const chrEmail = process.env.E2E_OIDC_EMAIL_CHROMIUM || process.env.E2E_OIDC_EMAIL;
const chrPassword = process.env.E2E_OIDC_PASSWORD_CHROMIUM || process.env.E2E_OIDC_PASSWORD;
const mobEmail = process.env.E2E_OIDC_EMAIL_MOBILE || process.env.E2E_OIDC_EMAIL;
const mobPassword = process.env.E2E_OIDC_PASSWORD_MOBILE || process.env.E2E_OIDC_PASSWORD;
const peerEmail = process.env.E2E_PEER_EMAIL;

test.describe('Complete 12-Page Senior E2E Matrix (Forms, Buttons, Modals, Theme, Drawer, ClamAV, RAG & Governance)', () => {
  test.skip(
    !chrEmail || !chrPassword || !mobEmail || !mobPassword || !peerEmail,
    'Requires live Keycloak OIDC actors and E2E_PEER_EMAIL',
  );

  test('exercises all 12 routes, form validations, modals, toasts, responsive drawer, binary upload, v2 versioning, SSE RAG, evaluations, FinOps, and RBAC', async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    const isMobile = testInfo.project.name.includes('mobile');
    const actorEmail = (isMobile ? mobEmail : chrEmail) ?? '';
    const actorPassword = (isMobile ? mobPassword : chrPassword) ?? '';
    const peer = peerEmail ?? '';

    const uniqueTag = `${isMobile ? 'MOB' : 'CHR'}${Date.now().toString(36).slice(-5)}`.toUpperCase();
    const orgName = `Atlas Corp ${uniqueTag}`;
    const kbName = `Normativa ${uniqueTag}`;
    const renamedKbName = `${kbName} v2`;
    const secretToken = `SELLO-SOBERANO-${uniqueTag}`;

    // 1 & 2. `/` LoginPage -> Keycloak 26 OIDC PKCE -> `/auth/callback` -> `/app` DashboardPage
    await loginViaKeycloakPkce(page, actorEmail, actorPassword);

    // 3. `/app` DashboardPage: ThemeToggle in header + actor pill
    await expect(page.getByText(actorEmail)).toBeVisible();
    await page.getByRole('button', { name: 'Tema Claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Tema Oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 4. `/app/knowledge` KnowledgePage: Zod validation, create org, create/rename/delete KB with ConfirmDialog
    await navigateAppSection(page, 'Bibliotecas');
    await expect(page.getByRole('heading', { level: 1, name: 'Bases de conocimiento' })).toBeVisible();

    await page.getByLabel('Nombre de organización').fill('A');
    await page.getByRole('button', { name: 'Crear organización' }).click();
    await expect(page.getByText('Mínimo dos caracteres')).toBeVisible();

    await page.getByLabel('Nombre de organización').fill(orgName);
    await page.getByRole('button', { name: 'Crear organización' }).click();
    await expect(page.locator('#tenant-choice')).toContainText(orgName, { timeout: 15_000 });

    const tempKb = `Temp ${uniqueTag}`;
    await page.getByLabel('Nombre de base').fill(tempKb);
    await page.getByRole('button', { name: 'Crear base' }).click();
    await expect(page.getByRole('link', { name: new RegExp(tempKb) })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: `Eliminar ${tempKb}` }).click();
    await expect(page.getByRole('alertdialog')).toContainText('¿Eliminar base de conocimiento?');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('alertdialog')).toBeHidden();

    await page.getByRole('button', { name: `Eliminar ${tempKb}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('link', { name: new RegExp(tempKb) })).toBeHidden({ timeout: 15_000 });

    await page.getByLabel('Nombre de base').fill(kbName);
    await page.getByRole('button', { name: 'Crear base' }).click();
    await expect(page.getByRole('link', { name: new RegExp(kbName) })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: `Renombrar ${kbName}` }).click();
    await page.getByLabel('Nuevo nombre').fill(renamedKbName);
    await page.getByRole('button', { name: 'Guardar' }).click();

    const kbLink = page.getByRole('link', { name: new RegExp(renamedKbName) });
    await expect(kbLink).toBeVisible({ timeout: 15_000 });
    await kbLink.click();

    // 5. `/app/knowledge/:id` DocumentPage: Binary RustFS+ClamAV upload + form validation + inline text
    await expect(page.getByRole('heading', { level: 1, name: 'Documentos' })).toBeVisible();

    await page.locator('#file').setInputFiles({
      name: `anexo-${uniqueTag}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(
        `Anexo técnico auditado en cuarentena ClamAV y RustFS para ${orgName}. Código binario: BIN-${secretToken}.`,
        'utf8',
      ),
    });
    await page.getByLabel('Título visible').fill(`Binario ${uniqueTag}`);
    await page.locator('#file-visibility').selectOption('tenant');
    await page.getByRole('button', { name: 'Enviar archivo a ingesta' }).click();
    await expect(page.getByText('Archivo enviado a ingesta segura')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Pegar texto' }).click();
    await page.getByRole('button', { name: 'Indexar texto' }).click();
    await expect(page.getByText('Ingresa un título')).toBeVisible();

    await page.getByLabel('Título').fill(`Politica ${uniqueTag}`);
    await page
      .getByLabel('Contenido')
      .fill(
        `Normativa oficial Zero Trust de ${orgName}: todo acceso aplica PostgreSQL FORCE RLS y exige el identificador ${secretToken}.`,
      );
    await page.getByRole('button', { name: 'Indexar texto' }).click();

    const policyItem = page.locator('li', { hasText: `Politica ${uniqueTag}` });
    const binaryItem = page.locator('li', { hasText: `Binario ${uniqueTag}` });
    await expect(policyItem.getByText(/ready|Listo/i)).toBeVisible({ timeout: 60_000 });
    await expect(binaryItem.getByText(/ready|Listo/i)).toBeVisible({ timeout: 60_000 });

    await policyItem.getByRole('link').click();

    // 6. `/app/documents/:id` DocumentDetailPage: Chunk Modal, Publish v2, ACL Grants, Cancel Delete
    await expect(page.getByRole('heading', { level: 1, name: `Politica ${uniqueTag}` })).toBeVisible();
    const docIdMatch = page.url().match(/\/app\/documents\/([0-9a-f-]{36})/i);
    expect(docIdMatch).not.toBeNull();
    const docId = docIdMatch?.[1] ?? '';

    await expect(page.getByText('Fragmento 1 · v1')).toBeVisible({ timeout: 25_000 });
    await page.getByRole('button', { name: 'Ampliar fragmento 1' }).click();
    await expect(page.getByRole('dialog')).toContainText('Fragmento 1 · Versión 1');
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.getByRole('button', { name: 'Texto', exact: true }).click();
    await page
      .getByLabel('Nuevo contenido textual')
      .fill(
        `Normativa oficial v2 actualizada de ${orgName}: el sello soberano vigente es ${secretToken} con verificación criptográfica v2.`,
      );
    await page.getByRole('button', { name: 'Subir versión v2' }).click();
    await expect(page.getByText('Fragmento 1 · v2')).toBeVisible({ timeout: 60_000 });

    await page.getByRole('button', { name: 'Guardar permisos' }).click();
    await expect(page.getByText('Permisos actualizados.')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Eliminar documento' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('¿Eliminar este documento?');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click();

    // 7. `/app/assistant` AssistantPage: Hybrid Search + Buffered Reauthorized SSE RAG
    await navigateAppSection(page, 'Búsqueda y respuesta');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Búsqueda y respuesta con evidencias' }),
    ).toBeVisible();
    await page.locator('#tenant-s').selectOption({ label: orgName });
    await expect(page.locator('#kb-s')).toContainText(renamedKbName, { timeout: 15_000 });
    await page.locator('#kb-s').selectOption({ label: renamedKbName });

    await page.getByRole('button', { name: /Solo búsqueda híbrida/i }).click();
    await page.getByLabel('Términos o consulta semántica').fill(secretToken);
    await page.getByRole('button', { name: 'Buscar fragmentos' }).click();
    await expect(
      page.getByRole('heading', { name: /Fragmentos (autorizados|recuperados) \([1-9]\d*\)/ }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('ul, ol').getByText(new RegExp(secretToken)).first()).toBeVisible();

    await page.getByRole('button', { name: /Respuesta sustentada \(SSE\)/i }).click();
    await page
      .getByLabel('Tu pregunta')
      .fill(`¿Cuál es el sello soberano vigente de la normativa v2? (${secretToken})`);
    await page.getByRole('button', { name: 'Preguntar' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /^Respuesta/ })).toBeVisible({
      timeout: 90_000,
    });

    // 8 & 9. `/app/conversations` & `/app/conversations/:id`: Validation, Create, SSE Turn, ConfirmDialog
    await navigateAppSection(page, 'Conversaciones');
    await expect(page.getByRole('heading', { level: 1, name: 'Conversaciones con evidencia' })).toBeVisible();
    await page.locator('#chat-tenant').selectOption({ label: orgName });
    await expect(page.locator('#chat-kb')).toContainText(renamedKbName, { timeout: 15_000 });
    await page.locator('#chat-kb').selectOption({ label: renamedKbName });

    await page.getByRole('button', { name: 'Crear conversación' }).click();
    await expect(page.getByText('Ingresa un título')).toBeVisible();

    const convTitle = `Sesión ${uniqueTag}`;
    await page.locator('#conversation-title').fill(convTitle);
    await page.getByRole('button', { name: 'Crear conversación' }).click();
    const convLink = page.getByRole('link', { name: new RegExp(convTitle) });
    await expect(convLink).toBeVisible({ timeout: 15_000 });
    await convLink.click();

    await expect(page.getByRole('heading', { level: 1, name: convTitle })).toBeVisible();
    await page.locator('#conversation-question').fill(`Indica el sello soberano vigente (${secretToken}).`);
    await page.getByRole('button', { name: 'Enviar pregunta' }).click();
    await expect(page.getByText(/^Asistente/)).toBeVisible({ timeout: 90_000 });

    await page.getByRole('button', { name: /Eliminar conversación/i }).click();
    await expect(page.getByRole('alertdialog')).toContainText(/Eliminar.*conversación/i);
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click();

    // 10. `/app/evaluations` EvaluationsPage: Dataset Validation, UUID Validation, Ground-Truth Run & Metrics
    await navigateAppSection(page, 'Evaluaciones');
    await expect(page.getByRole('heading', { level: 1, name: 'Evaluación de retrieval' })).toBeVisible();
    await page.locator('#eval-tenant').selectOption({ label: orgName });
    await expect(page.locator('#eval-kb')).toContainText(renamedKbName, { timeout: 15_000 });
    await page.locator('#eval-kb').selectOption({ label: renamedKbName });

    await page.getByLabel('Nombre del dataset').fill('Z');
    await page.getByRole('button', { name: 'Crear dataset' }).click();
    await expect(page.getByText('Mínimo dos caracteres')).toBeVisible();

    const datasetName = `Golden ${uniqueTag}`;
    await page.getByLabel('Nombre del dataset').fill(datasetName);
    await page.getByRole('button', { name: 'Crear dataset' }).click();
    await expect(page.locator('#dataset-choice')).toContainText(datasetName, { timeout: 15_000 });

    await page.getByLabel('Pregunta').fill(`Consulta sobre ${secretToken}`);
    await page.getByLabel('IDs UUID de documentos relevantes, separados por comas').fill('uuid-malformado');
    await page.getByRole('button', { name: 'Guardar caso' }).click();
    await expect(page.getByText(/UUID inválido/i)).toBeVisible();

    await page.getByLabel('IDs UUID de documentos relevantes, separados por comas').fill(docId);
    await page.getByRole('button', { name: 'Guardar caso' }).click();
    await expect(page.getByText('1 documentos esperados')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Ejecutar evaluación' }).click();
    await expect(page.getByText(/Recall@6: 100%/i)).toBeVisible({ timeout: 45_000 });

    // 11. `/app/operations` OperationsPage: FinOps Empty Guardrail, Budget Update & Audit Event Modal
    await navigateAppSection(page, 'Uso y auditoría');
    await expect(page.getByRole('heading', { level: 1, name: 'Uso, DLQ y gobierno' })).toBeVisible();
    await page.locator('#ops-tenant').selectOption({ label: orgName });

    const dailyCostInput = page.locator('#daily-cost');
    await expect(dailyCostInput).not.toHaveValue('', { timeout: 15_000 });
    await dailyCostInput.fill('');
    await page.getByRole('button', { name: 'Actualizar presupuesto' }).click();
    await expect(page.getByText('El presupuesto diario USD es obligatorio')).toBeVisible();

    await page.locator('#daily-limit').fill('250');
    await dailyCostInput.fill('750');
    await page.getByRole('button', { name: 'Actualizar presupuesto' }).click();
    await expect(page.getByText('Presupuesto actualizado.')).toBeVisible({ timeout: 15_000 });

    const inspectAuditBtn = page.getByRole('button', { name: /^Ver evento / }).first();
    await expect(inspectAuditBtn).toBeVisible({ timeout: 15_000 });
    await inspectAuditBtn.click();
    await expect(page.getByRole('dialog')).toContainText('Registro inmutable de gobernanza Zero Trust');
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // 12. `/app/security` SecurityPage: Email Validation, Member Invite, Role Update, Groups & ConfirmDialogs
    await navigateAppSection(page, 'Identidad');
    await expect(page.getByRole('heading', { level: 1, name: 'Miembros y grupos' })).toBeVisible();
    await page.locator('#security-tenant').selectOption({ label: orgName });

    await page.getByLabel('Correo del usuario').fill('correo-invalido');
    await page.getByRole('button', { name: 'Agregar miembro' }).click();
    await expect(page.getByText('Correo inválido')).toBeVisible();

    await page.getByLabel('Correo del usuario').fill(peer);
    await page.getByRole('button', { name: 'Agregar miembro' }).click();
    const peerRoleSelect = page.getByLabel(`Rol de ${peer}`);
    await expect(peerRoleSelect).toBeVisible({ timeout: 15_000 });
    await peerRoleSelect.selectOption('admin');
    await expect(page.getByText('Rol actualizado')).toBeVisible({ timeout: 15_000 });

    const groupName = `Auditores ${uniqueTag}`;
    await page.locator('#group-name').fill(groupName);
    await page.getByRole('button', { name: 'Crear grupo' }).click();
    await expect(page.locator('#group-select')).toContainText(groupName, { timeout: 15_000 });

    await page.locator('#group-user').selectOption({ label: peer });
    await page.getByRole('button', { name: 'Añadir al grupo' }).click();
    const removeFromGroupBtn = page.getByRole('button', { name: `Quitar del grupo a ${peer}` });
    await expect(removeFromGroupBtn).toBeVisible({ timeout: 15_000 });
    await removeFromGroupBtn.click();
    await expect(page.getByText('Este grupo aún no tiene integrantes.')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: `Eliminar grupo ${groupName}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar grupo' }).click();
    await expect(page.getByRole('button', { name: `Eliminar grupo ${groupName}` })).toBeHidden({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: `Remover miembro ${peer}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remover miembro' }).click();
    await expect(peerRoleSelect).toBeHidden({ timeout: 15_000 });

    // 13. `*` 404 Recovery -> Return to `/app` -> Clean OIDC Logout back to `/`
    await page.goto('/app-ruta-inexistente-404');
    await expect(page.getByRole('heading', { name: /404/ })).toBeVisible();
    await page.getByRole('link', { name: 'Regresar a la consola' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: /Conocimiento confiable, de extremo a extremo/i }),
    ).toBeVisible();

    await logoutFromConsole(page);
  });
});
