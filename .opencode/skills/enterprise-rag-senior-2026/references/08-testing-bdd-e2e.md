# 08 — Estrategia de Pruebas, BDD y Calidad

## Niveles de Verificación
1. **Linting & Formateo**: Biome 2.6.3 (`biome ci`) sin advertencias ni omisiones.
2. **Typecheck Estricto**: `tsc --noEmit` en backend y frontend.
3. **Pruebas Unitarias y de Integración**: Vitest con mocks limpios (sin `mockResolvedValue` reutilizados para streams de lectura).
4. **Validación de Contratos**: Verificación bidireccional OpenAPI sin discrepancias (43 paths, 100% esquemas 2xx).
5. **Invariantes BDD**: Ejecución de los 7 escenarios Gherkin (`bdd-runner.mjs`) que validan aislamiento de tenant, revocación de ACLs y detección de malware.
6. **Evaluación de Groundedness**: Tests offline en Python que miden precisión y cobertura de citas.
