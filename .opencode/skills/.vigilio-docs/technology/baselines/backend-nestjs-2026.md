# Baseline NestJS candidato 2026 — no aplicarlo a ciegas

Este archivo Markdown complementa el archivo de baseline existente `backend-nestjs.yaml`. La versión instalada y sus hashes son responsabilidad del repositorio consumidor. Las versiones estables verificadas fuera del proyecto no prueban integración con adapters, drivers ni tooling internos.

## Revisión antes de actualizar

1. Leer `package.json`, `pnpm-lock.yaml`, `node -v`, `tsconfig`, configuración Vitest, configuración OpenAPI y adaptadores existentes.
2. Distinguir NestJS runtime HTTP, worker SQS y runtime Lambda/EKS; no mezclar profiles.
3. Validar cambios mayores en NestJS, Zod, `nestjs-zod`, Drizzle, Pino y OTel con test de contratos.
4. Ejecutar pruebas de arquitectura, SQL con PostgreSQL real, authz, Redis y observabilidad.
5. Publicar versión aprobada solo cuando estén completos los gates y existan evidencias.

✅ Correcto: baseline `proposed` hasta tener compatibilidad demostrada; actualizar lockfile de cada consumidor mediante PR controlado.

❌ Incorrecto: anunciar Node 24/NestJS 12 instalados en todos los servicios sin consultar entornos reales, o romper AWS Lambda con una migración pensada para EKS.

Referencia histórica extensa: [tecnologías backend 2026](../catalog/references/43-backend-technologies-skill-2026.md).

## Procedencia documental preservada

- [Capítulo heredado: 43-backend-technologies-skill-2026.md](../catalog/references/43-backend-technologies-skill-2026.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Fuente:** Leer `technology/versions.md` para el baseline actual; este documento no es versión paralela.
2. **Matriz:** Comprobar runtime Node, adaptadores, Zod, Drizzle, OTel y dependencias de test como unidad.
3. **Condiciones:** Registrar ruptura de API/lockfile y plan de recuperación del consumidor.
4. **Contrato:** Asegurar compatibilidad OpenAPI antes de cambiar runtime o ORM.
5. **Prueba:** Ejecutar CI consumidor y separar NOT_RUN de PASS.
6. **Decision:** No propagar versiones en READMEs y skills: enlazar a propietario documental.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.
