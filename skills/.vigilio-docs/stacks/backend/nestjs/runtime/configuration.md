# NestJS: configuración Zod y secretos por runtime

Validar variables de entorno con Zod al arrancar, separar configuración no secreta de credenciales y elegir proveedor de secretos según runtime. No forzar CDK/Lambda a quien corre EKS.

```typescript
import { z } from 'zod';
const runtimeSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
});
// En bootstrap: const env = runtimeSchema.parse(process.env);
```

Este ejemplo valida presencia de cadena: no imprime `DATABASE_URL`, no convierte un log de error Zod en volcado indiscriminado de variables y no prueba por sí mismo conectividad.

✅ Correcto: configuración tipada por ambiente y verificación de permisos Secret Manager/SSM/Pod Identity.

❌ Incorrecto: guardar secretos reales en YAML o Markdown, mezclar valores de stage y generar defaults de producción inseguros.

[Secretos](../../../../standards/security/secrets-and-privacy.md) · [AWS runtime](../../../../platform/cloud/runtime-options.md).

## Procedencia documental preservada

- [Capítulo heredado: 29-config-nest-zod-aws.md](references/29-config-nest-zod-aws.md) — contenido íntegro conservado.
- [Capítulo heredado: 34-gestion-configuracion-hibrida-2026.md](references/34-gestion-configuracion-hibrida-2026.md) — contenido íntegro conservado.

## Contrato de configuración por entorno

Validar env **una vez al arrancar** antes de abrir sockets, workers o conexiones. No leer `process.env` en el dominio: inyectar puertos/config inmutables. Las URLs y secretos se obtienen del secret manager del runtime; las configuraciones públicas del frontend son contratos separados.

```typescript
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
});

export function loadConfiguration(source: NodeJS.ProcessEnv) {
  return environmentSchema.parse(source); // validación boundary al bootstrap
}
```

El esquema es ilustrativo: no registrar `DATABASE_URL` en logs ni retornar el objeto entero por rutas de debug. `z.coerce` es adecuado aquí porque **las variables de entorno son strings**, pero un `''` para un número debe rechazarse si el contrato lo exige (preprocesar antes de coerce).

**Gates:** configuración inválida → startup fail; secretos redactados; puertos validados; no modificar `.env` gestionado en un deployment; asegurar paridad Fargate/EKS/Lambda según destino real.

✅ Correcto: configuración central e inyectada con fallos al bootstrap.

❌ Incorrecto: defaults silenciosos para secretos o validar env diferentes en cada service.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Parse startup:** Validar variables de entorno una vez al arrancar y fallar ante secretos/URLs faltantes.
2. **Separación:** No mezclar build-time con runtime ni credenciales con valores públicos.
3. **Defaults:** Definir defaults solo para parámetros seguros, nunca para llaves o tenant.
4. **Logging:** No imprimir configuración con tokens/contraseñas en diagnósticos.
5. **Refresh:** Documentar rotación y reinicio sin estados parciales.
6. **Prueba:** Probar env faltante, inválido y configuración por entorno.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
