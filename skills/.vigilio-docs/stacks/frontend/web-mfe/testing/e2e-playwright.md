# Frontend Web MFE — E2E real con Playwright

**Responsabilidad:** navegación del navegador, rutas, accesibilidad, estado de sesión y contratos visibles del frontend web. La estrategia genérica se consulta en [testing E2E transversal](../../../../standards/testing/e2e-quality-gates.md). Versiones en [catálogo central](../../../../technology/versions.md).

```typescript
import { test, expect } from '@playwright/test';

test('un usuario anónimo ve la pantalla de autenticación', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
});
```

*Snippet ilustrativo:* nombres de rutas y UI pertenecen al consumidor. Referencia oficial: [Playwright Best Practices](https://playwright.dev/docs/best-practices).

## 20 comprobaciones específicas

1. Definir URL base y levantar BFF/UI mediante readiness, no `sleep`.
2. Usar `getByRole`, `getByLabel` y locators accesibles, nunca cadenas CSS frágiles sin motivo.
3. Aislar BrowserContext por test; no reutilizar cookies entre escenarios.
4. Preparar `storageState` por rol sin registrar tokens en artefactos.
5. Probar acceso directo a rutas protegidas sin sesión y con sesión expirada.
6. Verificar que BFF no expone credenciales del servidor al navegador.
7. Validar estados `loading`, `empty`, `error`, `success` para listas y formularios.
8. Rechazar entradas inválidas mostrando error legible y sin duplicar envío.
9. Confirmar paginación/orden con dataset estable desde contrato real.
10. Validar accesibilidad por teclado, foco y mensajes de error asociados.
11. Probar rutas, back/forward y refresh sin perder estado autorizado.
12. Simular latencia/503 sin comprobar tiempos con `waitForTimeout` fijo.
13. Validar responsive en dos viewports significativos del público objetivo.
14. Ejecutar smoke en navegadores soportados, no matriz arbitraria.
15. Verificar i18n, timezone y formato monetario si el dominio lo usa.
16. Capturar `trace on-first-retry` o al fallar con retención limitada.
17. No poner secretos/PII en screenshots, vídeos ni HTML snapshots.
18. Evitar `test.only`, detectar `test.skip` sin ticket ni caducidad.
19. Ejecutar tests en paralelo con fixtures de usuario/tenant independientes.
20. Asociar evidencia de cada fallo a commit, entorno, request-id y dueño.

✅ **Correcto:** assertions del comportamiento observable, locators resilientes y permisos probados desde UI. ❌ **Incorrecto:** snapshots enormes como único oráculo, sleeps fijos y mockear todo el BFF para afirmar flujo real E2E.

## Receta de suite representativa

**Preparación:** URL base y servidor de frontend/BFF accesibles en entorno aislado; cuentas de test por rol y tenant, endpoint de reset autorizado, datos predecibles, screenshots saneadas. Una página web no equivale a backend simulado cuando se afirma E2E real.

### Configuración de evidencias

```typescript
// Ejemplo para adaptar a la configuración real del proyecto.
import { defineConfig } from '@playwright/test';
export default defineConfig({
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  retries: process.env.CI ? 1 : 0,
});
```

**Atención:** capturar trace de falla no elimina tokens/PII automáticamente. Sanear cuentas, datos, rutas y artefactos antes de retenerlos.

### UI, accesibilidad y validación

```typescript
import { expect, test } from '@playwright/test';

test('formulario informa un dato inválido', async ({ page }) => {
  await page.goto('/products/new');
  await page.getByLabel('Número de póliza').fill('');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('alert')).toContainText('obligatorio');
});
```

**Ajustar al producto:** las etiquetas y rutas son ilustrativas; este ejemplo no es un test existente del ZIP.

### Matriz obligatoria de escenarios seleccionados

| Grupo | Positivo | Negativo | Prueba de falla |
|---|---|---|---|
| Autenticación | Login/sesión | Token vencido | 401/redirección segura |
| Autorización | Lector ve su dato | Otro tenant | Sin fuga del recurso |
| Formularios | Dato válido | XSS/required/rango | Feedback accesible |
| BFF | `count/results` | Payload inválido | 4xx y UI coherente |
| Navegación | Route/deep link | URL inválida | 404 y regreso seguro |
| Estado | Lista→detalle | Empty/error | Sin bloqueo permanente |
| Accesibilidad | Teclado/foco | Label ausente | Gate a11y |
| Red | Respuesta sana | 429/503/timeouts | Retry sin duplicación |

### Gate de CI

- Seleccionar browsers/viewport por soporte real, no por combinatoria artificial.
- Correr smoke en PR; regresión extendida por cambio de auth, routing o contrato.
- Prohibir `test.only`; toda cuarentena de `test.skip` requiere ticket y fecha.
- Adjuntar report, trace saneada y propietario; medir flakiness.
- Nunca convertir un retry verde en prueba de estabilidad absoluta.

✅ **Correcto:** selectors accesibles, usuario/tenant aislado y falla diagnóstica. ❌ **Incorrecto:** solo snapshots visuales o sleep fijo antes de cada assert.
