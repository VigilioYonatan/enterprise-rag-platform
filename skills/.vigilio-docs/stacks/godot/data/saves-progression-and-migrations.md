# Guardado, checkpoints, migraciones y progreso

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** juegos offline, guardado local, progresión y sincronización opt-in.

## Decisiones de arquitectura

1. El save debe ser versionado, con IDs estables de nivel/ítem; escribir de forma atómica (temporal + sustitución) y validar errores de I/O.
2. No serializar nodos vivos, claves privadas, contraseñas ni paths inseguros del usuario. Convertir datos de Godot a esquema serializable estable.
3. Guardar preferencias por separado de partidas; si hay nube, resolver conflictos por política de negocio (no sobrescribir sin preguntar).
4. Migrar formatos antiguos con fixtures, no editar saves en producción sin backups; tratar archivos importados como datos no confiables.

## Implementación de referencia

```gdscript
# Modelo simple; guardar después de validar y gestionar fallos.
var save_data := {
    "schema_version": 2,
    "level_id": "forest_01",
    "health": 80,
    "inventory": ["potion_small"]
}
var serialized := JSON.stringify(save_data)
var temp_path := "user://savegame.tmp"
var file := FileAccess.open(temp_path, FileAccess.WRITE)
if file == null:
    push_error("No se pudo crear archivo temporal de guardado")
else:
    file.store_string(serialized)
    file.flush()
    file.close()
    # Política de reemplazo atómico / backup: implementar y probar según plataforma.
```

El fragmento **no completa el reemplazo atómico**; no declararlo producción sin implementar `DirAccess.rename_absolute` y backup/recuperación probada.

## Verificación obligatoria

- [ ] Importar saves v1 y v2 con datos faltantes, corruptos y tamaños maliciosos.
- [ ] Corte de energía simulado tras escribir temporal: se conserva última partida válida.
- [ ] Reintento offline de nube sin duplicar compras o premios.

## Casos adversarios y revisión

- ❌ Escribir directamente sobre único save sin copia segura.
- ❌ `str2var`/deserialización confiando ciegamente en datos del usuario.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — saving games](https://docs.godotengine.org/en/stable/tutorials/io/saving_games.html)
- [Godot — data paths](https://docs.godotengine.org/en/stable/tutorials/io/data_paths.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).

## Escenario adicional — datos de guardado versionados

```gdscript
# SaveCodec.gd — sin acceso al disco: serialización pura testeable
class_name SaveCodec
extends RefCounted
const VERSION: int = 2
static func make_save(level_id: String, health: int) -> Dictionary:
    return {"version": VERSION, "level_id": level_id, "health": maxi(0, health)}
static func accepts(payload: Dictionary) -> bool:
    return payload.get("version") == VERSION and payload.get("level_id") is String \
        and payload.get("health") is int
```

En el adaptador filesystem escribir en `user://` temporal, validar bytes, sustituir archivo destino de forma segura y conservar backup cuando aplique. **Tests:** save/restore, datos truncados, versión vieja, inventario duplicado, disco sin espacio, nube vs local. **Negativo:** asignar directamente al personaje valores de JSON sin comprobar schema y límites.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Guardar .save sobreescribiendo directamente ante apagón
- **❌ Incorrecto**: Guardar .save sobreescribiendo directamente ante apagón.
- **✅ Correcto**: Temp file, flush y rename seguro cuando plataforma lo permita.

### 02. Deserializar viejo save sin versión y sobrescribir al fallar
- **❌ Incorrecto**: Deserializar viejo save sin versión y sobrescribir al fallar.
- **✅ Correcto**: Versionar, migrar y preservar original corrupto.

### 03. Guardar resource UID de escena sin resolver compatibilidad
- **❌ Incorrecto**: Guardar resource UID de escena sin resolver compatibilidad.
- **✅ Correcto**: Identificadores estables y estrategia de migración.

### 04. Enviar cloud save simultáneo sin conflictos
- **❌ Incorrecto**: Enviar cloud save simultáneo sin conflictos.
- **✅ Correcto**: Versionado ETag/revisión y resolución determinista.

### 05. Persistir datos sensibles en slot JSON plano
- **❌ Incorrecto**: Persistir datos sensibles en slot JSON plano.
- **✅ Correcto**: Minimizar PII y cifrar/autenticar donde el threat model lo requiera.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.
