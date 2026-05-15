# Backup, restore y recuperación: runbook

## Respuesta a incidentes

Declarar responsable, servicio/tenant afectado, RTO/RPO y prioridad. Evaluar snapshots/replicas y calidad de restauración. Ensayar restauración aislada periódicamente y verificar datos, grants y compatibilidad con migraciones del runtime.

✅ Correcto: simulacro de restauración con registro de tiempos, consistencia e indicadores del servicio.

❌ Incorrecto: asumir que «backup verde» garantiza RPO/RTO o restaurar a producción sin validación y aprobación.

**Verificación:** playbook de incidente, restauración parcial, comunicación, postmortem sin culpabilización y acciones correctivas verificables. [SRE transversal](../../standards/observability/slo-runbooks.md).

## Procedencia documental preservada

- [Capítulo heredado: 17-backup-restore-dr.md](../../standards/data/references/17-backup-restore-dr.md) — contenido íntegro conservado.
- [Capítulo heredado: 40-operacion-produccion.md](../../stacks/backend/nestjs/runtime/references/40-operacion-produccion.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


## Ensayo de recuperación ante desastre

Los siguientes controles son escenarios de diseño y revisión específicos de este documento. Usar pruebas reales y evidencias del consumidor; aquí **no** se afirma haber desplegado infraestructura.

1. **Control 1:** Definir RTO y RPO acordados para cada capacidad crítica, no genéricos por empresa.
2. **Control 2:** Mantener backups cifrados y acceso restringido, con auditoría de restauraciones.
3. **Control 3:** Comprobar retención, inmutabilidad y cobertura de BD, blobs, config y secrets recuperables.
4. **Control 4:** Ejecutar restore en entorno aislado con comprobación de consistencia y relaciones.
5. **Control 5:** Medir pérdida real de datos y tiempo de recuperación frente a RTO/RPO.
6. **Control 6:** Probar restauración a punto en el tiempo para un error de operador.
7. **Control 7:** Verificar compatibilidad del backup con schema/migraciones desplegadas.
8. **Control 8:** Reconstruir cachés, índices, colas y embeddings desde fuentes conservadas cuando aplique.
9. **Control 9:** Rotar credenciales y revocar tokens después de recuperación por compromiso.
10. **Control 10:** Documentar pasos de failover/failback, owner, evidencias y fecha del siguiente simulacro.

✅ **Correcto:** ejecutar cada control pertinente, registrar owner, evidencia y decisión de aceptación.

❌ **Incorrecto:** confundir un checklist con un despliegue probado o borrar restricciones anteriores por resumir.

## Prerrequisitos Operativos de PITR y Recuperación de Datos

1. **Operador CloudNativePG en Kubernetes:** Despliegue de clústeres PostgreSQL de alta disponibilidad mediante el operador CNPG (`postgresql.cnpg.io/v1`), con topología primaria-réplica y conmutación por error (failover) automática gestionada por quorum.
2. **Archivado Continuo WAL hacia S3 con Cifrado KMS:** Configuración obligatoria del bloque `barmanObjectStore` con destino en bucket Amazon S3, compresión de segmentos de WAL (`gzip` o `snappy`) y cifrado del lado del servidor mediante AWS KMS (`serverSideEncryption: aws:kms`).
3. **Identidad IAM por IRSA sin Credenciales Estáticas:** Prohibición terminante de inyectar variables de entorno `AWS_ACCESS_KEY_ID` o `AWS_SECRET_ACCESS_KEY` en los pods de base de datos. La autenticación con S3 se realiza exclusivamente mediante OIDC e IAM Roles for Service Accounts (`serviceAccountTemplate`).
4. **Política de Volúmenes Retain en Producción:** Obligatoriedad de definir `reclaimPolicy: Retain` en la StorageClass y en las plantillas de PVC (`storage.pvcTemplate`). Se prohíbe `reclaimPolicy: Delete` para prevenir pérdida accidental de datos en caso de eliminación inadvertida del recurso Cluster.
5. **Persistencia y Replicación Valkey / Redis:** Instancias de Valkey con persistencia híbrida (RDB periódico + append-only file AOF) y replicación multizona con conmutación por error supervisada.

## Matriz de Decisiones de Confiabilidad y Recuperación de Datos

| Contexto / Dimensión | Opción Recomendada | Alternativa Restringida | Razón Técnica y Riesgo |
|---|---|---|---|
| **Mecanismo de Respaldo** | Archivado continuo WAL + snapshots periódicos (`barmanObjectStore`) | Respaldo lógico periódico mediante `pg_dump` | `pg_dump` impone bloqueos transaccionales, no permite PITR (Point-in-Time Recovery) y eleva el RPO a horas. WAL streaming asegura RPO < 5 min. |
| **Política de Retención de Volúmenes** | `reclaimPolicy: Retain` | `reclaimPolicy: Delete` | `Delete` elimina los volúmenes subyacentes de EBS si se borra el clúster por error de operador, causando pérdida de datos catastrófica. |
| **Autenticación con Almacenamiento S3** | IRSA (IAM Roles for Service Accounts) | Credenciales estáticas en Kubernetes Secrets | Las credenciales estáticas pueden filtrarse en repositorios, manifests o logs de pods y no rotan automáticamente. |
| **Ambiente de Ensayo de Restauración** | Namespace efímero aislado (`staging-restore-drill`) | Restauración directa sobre el clúster activo | Ensayar en el clúster activo arriesga sobrescritura de datos de producción o colisión de nombres y endpoints de red. |
| **Estrategia de Persistencia en Memoria** | Valkey con AOF cada segundo (`fsync: everysec`) | Modo puramente en memoria (`emptyDir` o sin AOF) | Ante reinicio de pod, una caché puramente en memoria provoca un alud masivo de consultas (cache stampede) hacia la base de datos primaria. |

## Pruebas Negativas y Validaciones de Seguridad

- **Detección de reclaimPolicy: Delete:** Regla de validación CI y admisión de OPA/Gatekeeper que inspecciona manifiestos de tipo `Cluster` y `PersistentVolumeClaim`. Si `reclaimPolicy` es `Delete` en ambiente de producción, el deployment se bloquea automáticamente.
- **Fuga de credenciales estáticas de nube:** Escaneo estricto de manifests en busca de claves como `AWS_ACCESS_KEY_ID` o `AWS_SECRET_ACCESS_KEY`. Si se detectan secrets en texto plano, la validación falla de inmediato exigiendo el uso de IRSA.
- **Validación de archivado continuo WAL:** Si un clúster CloudNativePG omite la sección `backup.barmanObjectStore`, la regla de gobernanza falla marcando la configuración como incompleta y no apta para producción.
- **Prueba de inmutabilidad de backups:** Verificación de Object Lock (WORM - Write Once, Read Many) y versionado activo en el bucket de destino S3 para impedir alteración o borrado por malware o ransomware.

## Protocolo de Simulacro de Restauración (Restore Drill)

1. **Aprovisionamiento de entorno efímero:** Creación de un namespace aislado temporal (e.g., `staging-restore-drill-20261101`).
2. **Definición de objetivo de recuperación (PITR Target):** Especificar en el manifiesto de restauración el parámetro `recoveryTarget.targetTime` o `targetLSN` correspondiente al instante a recuperar.
3. **Inyección de configuración de recuperación:** Desplegar el clúster en modo `recovery` apuntando al bucket S3 con credenciales de lectura.
4. **Verificación de consistencia y relaciones:**
   - Comprobación de que PostgreSQL alcanza el estado `Cluster in healthy state`.
   - Ejecución de queries de verificación de integridad referencial y conteo de filas de auditoría.
   - Medición de tiempos reales: `actualRtoMinutes` (tiempo hasta clúster accesible) y `actualRpoMinutes` (diferencia temporal entre objetivo e impacto).
5. **Criterios de Aceptación:**
   - RTO real $\le$ 15 minutos para bases de datos transaccionales estándar.
   - RPO real $\le$ 5 minutos asegurado por segmentos de WAL archivados.
6. **Destrucción segura:** Una vez generado el reporte firmado de evidencia, se procede a desaprovisionar el namespace efímero.

## Evidencia Requerida y Estado Fail-Closed

Todo ejercicio o pipeline de infraestructura con estado debe generar el archivo de evidencia en `reports/pitr-drill-evidence.json`:
- Registro del timestamp de prueba, endpoint de destino y commit de infraestructura.
- Tiempos medidos de RTO y RPO frente a los acuerdos de nivel de servicio (SLO).
- Estado de verificación de consistencia (`PASS` / `FAIL`).
- **Fail-closed estricto:** Si las herramientas de preflight detectan que el bucket S3 es inalcanzable, o que no existen credenciales válidas en el entorno de ejecución, el reporte emite `NOT_RUN` y se rechaza la certificación de producción.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).
