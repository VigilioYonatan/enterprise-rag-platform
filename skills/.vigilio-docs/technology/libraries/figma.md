# Figma — diseño de producto y handoff opcional

**Estado:** referencia tecnológica, no dependencia obligatoria ni integración conectada.

## Para qué sirve y cuándo no

Figma permite diagramar flujos, crear variantes y componentes reutilizables, sistemas de diseño, prototipos y variables con modos. Para equipos con workflow de diseño es útil; para un proyecto Godot solo con Theme o una CLI sin UI, no exigir Figma. Debe respetarse la licencia, derechos de assets y confidencialidad.

## Modelo de trabajo recomendado

1. Registrar brief y usuarios antes de definir frames. 2. Definir colecciones de variables semánticas por modo (light/dark/high-contrast) y tipos. 3. Crear componentes con estados y variantes; **Auto Layout** para restricciones y tamaños. 4. Documentar navegación, errores, carga, focus y transiciones, no solo pantallas happy-path. 5. Handoff versionado con tokens en código y diff, propietarios de componentes y evidencia de pruebas. 6. No prometer sincronización automática Figma ↔ repo sin conector/aplicación autorizada.

## Criterios

- [ ] No duplicar paleta de marca en cada frame; revisar aliases y cambios.
- [ ] Probar variaciones de texto, dimensiones, idiomas y modos.
- [ ] Verificar en producto real; prototipo no es E2E.
- [ ] Accesibilidad contra WCAG/guías nativas con método de prueba claro.

## Fuentes

- [Figma variables, collections, modes](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- [Figma variables guide](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
- [Normas UX](../../standards/experience/README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Dar por implementada una interfaz solamente por su especificación.
