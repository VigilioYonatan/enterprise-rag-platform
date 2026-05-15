# Ruta histórica — validadores HTTP y DTOs

> **Sustituida el 25 de octubre de 2026.** La norma vigente está en [Contratos HTTP en un solo DTO](http-dtos-and-contracts.md). Ya **no** se recomiendan archivos `*.validator.ts` ni carpetas `validators/` para HTTP; el Zod y el tipo derivado viven juntos en `*.dto.ts`.

El texto normativo anterior se conserva íntegro en [histórico HTTP](historico-http-validators-and-dtos-2026-10-25.md) para auditorías y migraciones de proyectos existentes. No usar el documento histórico como plantilla para código nuevo.

✅ **Correcto:** usar un solo `.dto.ts` con Zod y tipo inferido según la norma actual.

❌ **Incorrecto:** tomar esta antigua URL como autorización para crear validadores HTTP separados.
