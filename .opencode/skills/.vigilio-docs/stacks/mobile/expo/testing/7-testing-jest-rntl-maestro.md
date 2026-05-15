# Testing Con Jest, RNTL Y Maestro

## Pirámide mobile

| Capa | Herramienta | Qué demuestra |
|---|---|---|
| Contrato/unit | Jest + Zod | reglas, transformaciones y errores |
| Hook/provider | RNTL `renderHook` | lifecycle, queries y estado |
| Componente/screen | Testing Library React Native | interacción y accesibilidad |
| E2E | Maestro | app instalada, navegación y backend controlado |
| Release smoke | dispositivo físico | binario firmado y servicios reales aprobados |

Snapshots extensos no sustituyen assertions de comportamiento.

## Aislamiento

Cada prueba crea QueryClient con retry desactivado y garbage collection inmediato. SecureStore,
NetInfo, AppState, picker y backend se reemplazan en el borde. Los mocks no reimplementan la lógica
que pretenden comprobar.

## Matriz mínima

- contrato válido e inválido;
- loading, vacío, error y éxito;
- create/update/delete e invalidación;
- login, restore, logout y refresh fallido;
- picker cancelado, upload exitoso y PUT rechazado;
- offline/online y background/foreground;
- labels, roles, focus y tamaño de texto.

## Cobertura

El baseline exige al menos 85% global en statements, branches, functions y lines. Los módulos de
seguridad, sesión, pagos o uploads pueden exigir más. No se excluye código difícil sin justificarlo;
se prueban especialmente branches de error.

```bash
pnpm test
pnpm test:coverage
```

Una prueba no debe depender de `--forceExit`: handles abiertos indican lifecycle o cache sin cerrar.

## Maestro

Los flows viven en `tests/e2e/`, usan accessibility labels estables y preparan datos deterministas.
No contienen credenciales. El pipeline guarda logs/screenshot de fallo y separa smoke PR de matriz
nocturna.

```yaml
appId: pe.rimac.mobile
---
- launchApp:
    clearState: true
- assertVisible: "Autenticacion"
- tapOn: "Productos"
- assertVisible: "CRUD de productos"
```

Validar YAML no equivale a ejecutar Maestro. La evidencia E2E registra plataforma, OS, modelo,
versión de app, backend y resultado.

## Flakiness

Se esperan elementos/estados, no sleeps fijos. Reintentar el job completo oculta defectos; primero se
capturan artefactos y se corrige sincronización, animación, datos o dependencia externa.

## Definition of Done

Pruebas pasan sin warnings de `act`, coverage supera gates y el recorrido crítico corre en al menos
un target Android y uno iOS antes de producción.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).


## Amplitud de cobertura relacionada

Aplicar la [matriz extendida de escenarios](e2e-maestro.md) y seleccionar los controles relevantes por riesgo, sin convertir una lista de 2–3 ejemplos en cobertura total. ✅ Registrar evidencia por escenario; ❌ declarar ejecutado lo que solo se documentó.
