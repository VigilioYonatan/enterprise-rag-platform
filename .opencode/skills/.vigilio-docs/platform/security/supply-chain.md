# Seguridad De La Cadena De Suministro (Supply Chain Security)

Establece las directrices para la atestación criptográfica, generación de SBOM, triaje VEX y verificación en admisión de artefactos de software según el marco SLSA v1.2.

## Estructura De Seguridad De La Cadena De Suministro

Para garantizar la integridad y trazabilidad desde el commit hasta el pod en ejecución, la plataforma implementa capacidades compatibles con los requisitos de SLSA. El nivel efectivo demostrado depende de la evidencia verificable del pipeline, no de la mera generación de artefactos de procedencia:

```text
Commit en Git ──> CI Runner Seguro ──> Generación de Imagen OCI
                         │
                         ├──> SBOM con Syft (SPDX / CycloneDX)
                         ├──> Escaneo con Grype / Trivy
                         ├──> Triaje de falsos positivos con OpenVEX
                         ├──> Firma Keyless con Cosign (Fulcio + Rekor)
                         └──> Atestación de procedencia (In-Toto / SLSA)
                                      │
                                      ▼
                        Kubernetes Admission Controller
                   (Kyverno / Sigstore Policy Controller)
                         │ (Verifica firma y políticas)
                         ▼
                     Pod Ejecutado en Producción
```

## Niveles SLSA v1.2 (Build Track): Demostrado Vs Declarado

El marco SLSA v1.0 ha sido oficialmente retirado; la plataforma se alinea estrictamente con la especificación vigente [SLSA Build Track v1.2](https://slsa.dev/spec/v1.2/build-track-basics).

El nivel SLSA no se autocertifica ni se infiere por la mera ejecución de un pipeline en CI. De acuerdo con SLSA v1.2:

1. **Build Level 1 (Procedencia Existente):**
   - Requiere la generación de un documento formal de procedencia (provenance) emitido por el build que describa cómo se produjo el artefacto, sus parámetros de invocación e inputs de nivel superior.
   - *Aclaración técnica:* Ejecutar compilaciones o tests en un runner de CI **NO** constituye Build L1 si no se emite formalmente el documento de procedencia estructurado.
2. **Build Level 2 (Procedencia Alojada y Firmada):**
   - La procedencia debe ser generada y firmada criptográficamente por un servicio de build alojado confiable, impidiendo que el desarrollador falsifique los metadatos de procedencia localmente.
   - *Precisión técnica:* Utilizar GitHub Actions con GitHub Attestations o GitLab CI provenance **no otorga automáticamente Build L2**; el builder específico, la generación del documento y las políticas de verificación deben satisfacer conjuntamente todos los requisitos de L2.
3. **Build Level 3 (Plataforma Endurecida y Aislada):**
   - Incluye todos los requisitos de Build L2.
   - Plataforma de build endurecida donde la procedencia es resistente a la falsificación (generada por un plano de control fuera del alcance de cualquier paso controlado por el usuario).
   - Aislamiento estricto entre todas las ejecuciones de compilación (incluso entre ejecuciones consecutivas del mismo proyecto o tenant, no únicamente entre tenants distintos) para prevenir contaminación cruzada de estado o caché.
   - Entorno de ejecución efímero por cada invocación.
   - Secretos de firma inaccesibles para los pasos de compilación controlados por el usuario.
   - *Aclaración sobre hermeticidad:* El aislamiento entre todas las ejecuciones y el entorno efímero **no deben confundirse con hermeticidad**. Prohibir el acceso a red o exigir builds totalmente herméticos es una propiedad adicional deseable, pero **NO** es un requisito obligatorio para certificar Build L3 en SLSA v1.2.

> [!WARNING]
> La plataforma declara capacidades compatibles con SLSA v1.2, pero el nivel operativo debe ser auditado y demostrado en cada pipeline. Nunca se debe certificar L2 o L3 sin atestaciones verificables generadas por un builder auditado.

## Política VIGILIO Frente A Rekor

- **Requisito universal SLSA:** Procedencia auténtica, íntegra y criptográficamente verificable.
- **Política institucional VIGILIO:** Exigir adicionalmente el registro en el libro mayor de transparencia pública o privada (Rekor / Sigstore) para no repudio y auditoría externa, **siempre que el modelo de confidencialidad del proyecto y las restricciones de datos lo permitan**.

## Prerrequisitos De Implementación

1. Runners de CI con identidad federada OIDC (GitHub Actions / GitLab CI) sin claves privadas estáticas.
2. Herramientas fijadas según `versions.yaml`: Cosign >= 2.4.0, Syft >= 1.10.0, Grype >= 0.80.0.
3. Controladores de admisión en clúster (Kyverno o Sigstore Policy Controller) desplegados en modo fail-closed para producción.

## Matriz De Decisiones: Triaje De Vulnerabilidades Con OpenVEX

| Escenario de CVE | Estado OpenVEX | Justificación Requerida | Acción en Pipeline |
|---|---|---|---|
| CVE crítico en código invocado | `affected` | N/A (Vulnerabilidad real) | **Bloqueo inmediato** del release |
| CVE en dependencia no importada/utilizada | `not_affected` | `component_not_present` o `vulnerable_code_not_in_execute_path` | Pasa con atestación VEX aprobada |
| CVE mitigado por controles externos (eBPF/WAF) | `not_affected` | `vulnerable_code_cannot_be_controlled_by_adversary` | Pasa con revisión de seguridad |
| Parche en desarrollo por proveedor | `under_investigation` | Ticket de seguimiento con TTL <= 14 días | Pasa condicionalmente a staging |

## Pruebas Negativas Y Detección De Falsificaciones

- **Imagen No Firmada:** Despliegue de una imagen construida localmente sin firma Cosign; el Admission Controller debe rechazar la creación del pod con código HTTP 403 / Admission Webhook Denied.
- **Firma Corrupta / Digest Manipulado:** Alteración de un solo byte en la capa de la imagen OCI; la verificación con `cosign verify` debe fallar inmediatamente.
- **Atestación VEX Expirada:** Documentos VEX con fecha de expiración superada deben ser rechazados automáticamente en el gate de producción.

## Procedimiento De Rollback Y Admisión

1. **Rechazo en Admisión:** Si una imagen promovida falla la verificación de firma o procedencia en el Admission Controller, el despliegue de Kubernetes se aborta automáticamente preservando los pods de la réplica anterior (cero indisponibilidad).
2. **Revocación de Firmas:** En caso de compromiso de dependencias, registrar la revocación en el log de transparencia o actualizar la política de Kyverno para rechazar digest específicos.

## Evidencia Requerida Para Auditoría

- Documento SBOM (`sbom.spdx.json`) archivado como artefacto inmutable del build.
- Atestación de procedencia SLSA v1.2 (`provenance.json`) firmada mediante OIDC y verificada criptográficamente.
- Archivo VEX (`triage.openvex.json`) firmado digitalmente por el responsable de seguridad si existen excepciones.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Generar procedencia estructurada bajo SLSA v1.2 y firmar imágenes con Cosign mediante OIDC del runner, bloqueando la admisión si falta la firma.
- ❌ **Incorrecto:** Confundir aislamiento y efimeridad de Build L3 con hermeticidad de red obligatoria, o asumir Build L2 automáticamente sin auditar el builder.
- ✅ **Correcto:** Documentar excepciones de CVEs no explotables mediante declaraciones OpenVEX formalizadas y aprobadas por seguridad.
- ❌ **Incorrecto:** Desactivar la verificación de admisión en el clúster para acelerar un despliegue de emergencia o usar tags flotantes (`latest`).

## Evidencia Requerida y Estado Fail-Closed

Todo pipeline de construcción y firma de imágenes debe adjuntar evidencia verificable en 
eports/supply-chain-evidence.json:
- Digest inmutable SHA-256 de la imagen generada.
- Registro de firma Cosign Keyless validado en Rekor (o registro local según política).
- Certificado de escaneo Grype con cero vulnerabilidades críticas no triajadas en OpenVEX.
- **Fail-closed estricto:** Si las herramientas de preflight detectan que el token OIDC no está disponible (id-token: write ausente) o que el proveedor Fulcio es inalcanzable, el reporte emite NOT_RUN y se detiene el release.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

