# Seguridad En Tiempo De Ejecución Con Políticas eBPF Y Tetragon

Establece las directrices para la monitorización a nivel de kernel, detección de anomalías y bloqueo activo de intrusiones en Kubernetes mediante Cilium Tetragon, Cilium Network Policies y Kyverno.

## Visibilidad Y Bloqueo A Nivel De Kernel Linux

A diferencia de los agentes tradicionales de seguridad que interceptan llamadas en el espacio de usuario, Tetragon aprovecha eBPF (extended Berkeley Packet Filter) directamente en el kernel de Linux. Esto permite inspección profunda y aplicación de políticas con mínimo consumo de CPU.

```text
Espacio de Usuario:  [ Contenedor Vulnerado / Intruso ]
                               │ (Llamada al sistema: execve "/bin/sh")
───────────────────────────────┼────────────────────────────────────────
Kernel Linux (eBPF):   [ Sensor Tetragon eBPF ]
                               │ (Evalúa TracingPolicy)
                               ▼
                      ¿Shell interactivo en Prod?
                      ├── SÍ ──> Envía SIGKILL inmediato al proceso
                      └── Registra evento JSON en OTel / SIEM corporativo
```

## Separación Entre Evaluación Estática Y Demostración Runtime

Para prevenir certificaciones falsas o complacientes, la plataforma distingue rigurosamente dos planos de validación:

1. **Evaluación Estática de Manifiestos:**
   - Análisis sintáctico y semántico de `TracingPolicy`, `CiliumNetworkPolicy` y `ClusterPolicy`.
   - Verificación de delimitación por namespace y selector de workload.
   - Detección y bloqueo estricto de configuraciones inseguras (`privileged: true`, `hostNetwork: true`, `allowPrivilegeEscalation: true`, `CAP_SYS_ADMIN`, `failurePolicy: Ignore` en Kyverno, y comodines de egress `0.0.0.0/0`).
2. **Demostración Runtime Verificable (Gate Dinámico):**
   - La validez de un archivo YAML **NO** es suficiente para emitir un veredicto de producción.
   - Se exige evidencia comprobada de soporte en el kernel (`btfEnabled: true`, `ebpfSupported: true`, Linux >= 5.10).
   - Comprobación de salud y latencia del webhook de admisión de Kyverno (`kyvernoAdmissionWebhookHealthy: true`).
   - Medición de la tasa de falsos positivos en el clúster (`falsePositiveRate: 0.0`).
   - **Fail-Closed:** Si el pipeline no tiene acceso al clúster o falta la telemetría del sensor eBPF, el resultado es estrictamente `NOT_RUN`, impidiendo la promoción a producción.

## Progresión De Despliegue: Observe → Audit → Enforce

Las políticas de Tetragon jamás deben desplegarse directamente en modo de interrupción (`Sigkill`) a nivel de clúster. La progresión obligatoria es:

1. **Observe (Monitoreo Pasivo):** Despliegue de sensores eBPF exclusivamente para registro de telemetría sin intervención de procesos. Se mide el volumen de eventos y se mapean llamadas habituales del runtime.
2. **Audit (Alertas Sin Bloqueo):** Las políticas emiten alertas de severidad alta hacia Grafana/OTel y SIEM corporativo. Se refinan excepciones para health checks, liveness probes, sidecars de servicio y operadores.
3. **Enforce (Bloqueo Activo Delimitado):** Tras verificar tasa de falsos positivos nula (`falsePositiveRate == 0.0`), se activa la acción `Sigkill` con rate-limiting (`rateLimit: 100/second`), acotada por namespace y workload mediante selectores específicos.
4. **Break-Glass Auditado con TTL:** Protocolo formal para desactivar temporalmente el enforcement durante emergencias operativas.

## Protocolo Operativo De Break-Glass

En caso de emergencia operacional justificada que requiera eludir temporalmente políticas de runtime:

- **Identificación:** Registro obligatorio de ticket de soporte/incidente (e.g., `SEC-EMERGENCY-20261101-09`).
- **Propietario:** Ingeniero o líder de SRE identificado como responsable on-call (`sre-oncall@vigilio.com`).
- **Motivo Detallado:** Justificación técnica auditable del mantenimiento o incidente.
- **TTL Improrrogable:** Límite máximo de vigencia de 120 minutos (`ttlMinutes <= 120`). Todo break-glass sin fecha de expiración es rechazado automáticamente.
- **Auditoría y Revocación Automática:** Envío simultáneo de registros de activación a S3 inmutable / SIEM y programación de rollback automático tras expirar el TTL.

## Matriz De Decisiones De Seguridad En Runtime

| Dimensión / Vector | Opción Recomendada | Alternativa Restringida | Razón Técnica y Riesgo |
|---|---|---|---|
| **Enforcement Tetragon** | `Observe -> Audit -> Enforce` por workload | `Sigkill` global directo sin selector | Aplicar SIGKILL a nivel global interrumpe procesos legítimos del clúster y causa caídas de servicio masivas. |
| **Aislamiento de Red Cilium** | Default-deny con egress explícito por FQDN y puerto | Egress comodín amplio (`0.0.0.0/0`) | Egress no restringido permite exfiltración de credenciales, tokens y establecimiento de túneles Command & Control (C2). |
| **Política de Fallo Kyverno** | `failurePolicy: Fail` en producción | `failurePolicy: Ignore` | `failurePolicy: Ignore` omite la validación de seguridad si el webhook se satura, permitiendo la inyección de pods maliciosos. |
| **Capacidades de Contenedores** | Pod Security Standards `restricted` (`drop: [ALL]`) | `privileged: true` o `CAP_SYS_ADMIN` | Contenedores privilegiados permiten escape hacia el nodo host y control total del kernel del nodo subyacente. |
| **Gestión de Emergencias** | Break-Glass auditado con TTL <= 120 min | Excepciones permanentes sin propietario | Excepciones sin TTL se convierten en puertas traseras permanentes y violan los estándares de cumplimiento PCI-DSS / SOC2. |

## Evidencia Requerida y Estado Fail-Closed

Todo despliegue o certificación de seguridad en runtime debe registrar su evidencia en `reports/break-glass-evidence.json`:
- Compatibilidad del kernel de nodos comprobada (`kernelVersion`, `btfEnabled: true`, `ebpfSupported: true`).
- Estado de los controladores de admisión (`kyvernoAdmissionWebhookHealthy: true`).
- Tasa medida de falsos positivos en periodo de observación (`falsePositiveRate == 0.0`).
- Estado del protocolo de Break-Glass (inactivo por defecto, o con ticket, TTL y auditoría configurada).
- **Fail-closed estricto:** Si falta la evidencia de demostración en runtime o el clúster es inaccesible, se emite veredicto `NOT_RUN` y se bloquea el paso a producción.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Desplegar Tetragon en progresión Observe → Audit → Enforce con TracingPolicies acotadas por namespace, Cilium default-deny y break-glass temporal auditado con TTL.
- ❌ **Incorrecto:** Activar SIGKILL global indiscriminado, permitir pods privilegiados, usar `failurePolicy: Ignore` en Kyverno o dejar break-glass permanente sin expiración.
- ✅ **Correcto:** Exigir demostración verificable del runtime de eBPF en el clúster antes de declarar `PASS`, emitiendo `NOT_RUN` si falta telemetría.
- ❌ **Incorrecto:** Confundir la validez sintáctica de un archivo YAML con una demostración operativa en runtime o asumir que un pod funciona sin evaluar el kernel.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).
