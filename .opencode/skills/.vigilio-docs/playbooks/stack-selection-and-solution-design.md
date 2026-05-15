# Diseño de soluciones y elección de stack — Vigilio Auto-Senior 2026

**Estado:** playbook canónico de recomendación previa a implementación. **Owner:** `playbooks/`. **No supone** la existencia de un repositorio, un agente persistente o un acuerdo previo sobre Rust/C++.

## Caso A — «Quiero una aplicación de escritorio para una fintech»

La primera respuesta no debe ser un monorepo inventado con GPUI obligatorio. Inspeccionar proyecto si existe y, si no existe, entregar una recomendación provisional con alternativas y decisiones que cambian el diseño. Fintech no es sinónimo de un framework: integridad del dinero, autenticación, disponibilidad, amenazas, jurisdicción, permisos y auditoría condicionan la solución.

### Descubrimiento inicial

1. **Producto:** terminal administrativa, billetera, trading, POS, agente de soporte, cliente de un core bancario, conciliación o dashboard. Estos productos tienen riesgo y arquitectura diferentes.
2. **Entorno:** Windows/macOS/Linux declarados, despliegue administrado, actualizaciones, modo offline, hardware sensible, requisitos de accesibilidad.
3. **Datos:** dinero y moneda, exactitud decimal, consistencia, reconciliación, datos personales, retención, auditoría, cifrado, tokens y límite de uso local.
4. **Integraciones:** API del backend existente, proveedor de identidad, hardware, banco, PCI scopes o normas aplicables según jurisdicción. No afirmar cumplimiento regulatorio sin auditoría especializada.
5. **Equipo/operación:** experiencia Rust/C++/Qt, plazos, mantenimiento, vulnerabilidades, licencias y frecuencia de parches de motor UI.

### Matriz de opciones (no es ranking absoluto)

| Elección | Conveniente cuando | Riesgos que hay que validar | Especialización |
|---|---|---|---|
| Rust + UI nativa GPUI | equipo domina Rust, editor/paneles avanzados, rendimiento nativo y versión GPUI compatible | GPUI pre-1.0, soporte real de SO, accesibilidad, tooling GUI | Rust Core + Desktop/GPUI |
| C++20 + Qt Widgets | UI madura con formularios/tablas complejas, SO soportados y experiencia Qt | memoria/ABI, licencias/distribución Qt, lifecycle QObject | C++ Core + Qt Desktop |
| C++20 + Qt WebEngine | el producto necesita incrustar contenido web de confianza gestionada | superficie Chromium, perfiles, cookies, sandbox, actualizaciones | Qt WebEngine **solo si hace falta** |
| Web/desktop wrapper existente | el cliente ya tiene UI web sólida y soporte de stack, y requisitos offline/OS lo permiten | actualizaciones, integridad de sesión, aislamiento de datos y superficie web | skill del stack **realmente disponible** |

**Regla:** un dashboard de pagos no necesita crear su propio procesador de pagos ni guardar secretos de clientes en SQLite por defecto. La fuente autoritativa suele ser backend; el cliente local puede manejar caché y estado efímero con política explícita. Dinero utiliza representación exacta y pruebas de idempotencia, conciliación y autorización.

### Recomendación y preguntas mínimas

Dar una opción recomendada provisional **con condiciones** y al menos una alternativa. Preguntar solamente lo necesario para comprometer arquitectura: objetivo principal, SO reales, necesidad offline, identidad/servicios existentes y alcance de datos sensibles. El resto debe inferirse de repositorio, ADR o decisión de producto disponible. Una respuesta arquitectónica no crea automáticamente archivos, conectores ni base de datos.

## Caso B — «Quiero agregar un login»

1. Inspeccionar módulos auth, sesiones, guards/policies, rutas, formularios, contratos HTTP y tests existentes.
2. Si React Hook Form está instalado, leer su guía; si no, no instalarlo por preferencia del agente. Para Rust/Qt no se impone Zod.
3. Comparar autenticación local vs SSO según capacidades actuales, recuperación/MFA, cookies, CSRF, tokens, revocación, auditoría y límite de intentos.
4. Preguntar elección funcional solo si no aparece en código/reglas; recomendar mínima adaptación sin duplicar auth.
5. Implementar después de decisiones autorizadas, probar credenciales, permisos, expiración, logout, ataques y usuarios existentes; finalizar review independiente.

## Caso C — «Quiero crear un videojuego» cuando en el futuro hay skills Bevy/Unreal/Godot

El router descubre las SKILL.md nuevas por frontmatter (`routing_ecosystems`, `routing_keywords`, `routing_files`, `routing_capabilities`). Antes de elegir motor, el agente compara 2D/3D, plataformas, red/multiplayer, monetización, recursos del equipo, física, assets, licencia y distribución. Si ninguna skill relevante está instalada, **informar ausencia**, no fingir cobertura.

## Evidencia de una recomendación arquitectónica

El reporte contiene intención, supuestos explícitos, criterios ponderados, alternativas, riesgo, fuente documental consultada, versión efectiva del producto, dependencias descubiertas, decisión pendiente y **nota del plan**. Si todavía no hay código, el score de implementación es `NOT_RUN`/`null`, nunca 10/10.

## Transición segura a BUILD

- Solo al confirmar stack y alcance: cargar skills propietarias y guías canónicas completas.
- Con repositorio real: registrar base Git, consumers, contratos, migraciones, pruebas, recursos y autorizaciones.
- Para cambio complejo usar plan con hitos y hashes de fuentes, pero no prometer el Execution Runner persistente hasta que esté instalado y probado.
- Realizar unit/integration/E2E adecuados al producto, control de seguridad, compatibilidad y review read-only del diff; el CI de PR debe ser independiente del agente.

## ✅ Correcto / ❌ Incorrecto

- ✅ Correcto: recomendar Qt para una fintech orientada a formularios con experiencia Qt comprobada, o Rust si la capacidad/plataformas reales lo respaldan, con riesgos documentados.
- ✅ Correcto: al agregar skills futuras, descubrirlas por el catálogo sin actualizar cada caso de uso manualmente.
- ❌ Incorrecto: «Fintech = Rust y GPUI», «login = crear tabla auth nueva» o «videojuego = Unreal» sin revisar requisitos.
- ❌ Incorrecto: anunciar pruebas de GUI, PCI compliance o controles regulatorios como PASS sin evidencias.

## Referencias

- [Descubrimiento de capacidades](../standards/ai/dynamic-capability-discovery.md)
- [Orquestación](../standards/ai/skill-orchestration-policy.md)
- [Trazabilidad](../standards/engineering/use-case-traceability.md)
- [Rust](../stacks/rust/README.md) y [C++](../stacks/cpp/README.md)
- [Impacto y review](../standards/engineering/change-impact-and-review-gates.md)
