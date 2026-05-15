# Godot Engine 4.x — Referencia tecnológica Senior/Staff

## Estado y selección de versión

Referencia del 26 de octubre de 2026: **4.7.2 estable** publicada el 18 de agosto de 2026; 4.8 beta no es base predeterminada para producto estable. Verificar el proyecto real (`project.godot`, Godot --version y export templates) antes de aplicar APIs; no actualizar silenciosamente.

- [Archivo de versiones Godot](https://godotengine.org/download/archive/)
- [Política oficial de releases](https://docs.godotengine.org/en/stable/about/release_policy.html)
- [Manual estable](https://docs.godotengine.org/en/stable/)

## Alcance

GDScript tipado, C# cuando plataforma/runtime lo permita, editor Godot, escenas, Resources, CharacterBody2D/3D, AnimationPlayer/AnimationTree, AudioServer/buses, señales, InputMap, networking HTTP/multiplayer y export presets.

## Ciclo de adopción

1. Comprobar plataformas/dispositivos, C# vs GDScript, género y restricciones de licencias.
2. Fijar binario y hash, addons/plugins/versiones y plantillas de exportación.
3. Leer [Docs Godot](../../stacks/godot/README.md) y probar importación de escenas en CI; ejecutar E2E gráfico antes de release.
4. Versionar presets públicos y no incluir `.godot/export_credentials.cfg` ni material protegido.

✅ Correcto: fijar 4.7.2 si compatible y probar importación/export. ❌ Incorrecto: elegir beta por ser más nueva y asegurar compatibilidad sin ejecutar.
