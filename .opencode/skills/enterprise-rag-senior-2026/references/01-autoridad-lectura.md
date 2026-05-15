# 01 — Autoridad y Lectura Canónica

## Precedencia Normativa
1. Instrucciones directas del usuario y políticas del sistema.
2. Reglas del proyecto en `AGENTS.md`.
3. Documentos canónicos en `docs/` (`ARCHITECTURE_V2.md`, `SECURITY.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`).
4. Skills instaladas en `.opencode/skills/` y `platform-actions/skills`.
5. Convenciones del stack (Node 24, NestJS 11, React 19, Tailwind CSS 4, Drizzle ORM, PostgreSQL 17, RustFS).

## Principio Antialucinación
- Si una herramienta o runtime no está accesible en el host (ej. Docker daemon o máquina Podman apagada), registrar `BLOCKED / NOT_RUN` de forma transparente.
- Nunca asumir paquetes ni crear dependencias externas no declaradas en los `package.json` de cada repositorio.
- Prohibido crear paquetes raíz (`package.json`, `pnpm-workspace.yaml` en la raíz) para mantener la independencia estricta de los 5 repositorios.
