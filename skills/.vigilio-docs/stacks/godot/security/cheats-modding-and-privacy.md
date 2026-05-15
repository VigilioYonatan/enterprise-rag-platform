# Seguridad de juegos — anti-cheat, mods, privacidad y pagos

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** juegos online, plugins/mods, matchmaking, datos y comercio.

## Decisiones de arquitectura

1. El cliente y archivos de guardado son manipulables. Validación server-side para logros competitivos, compras, monedas premium y rankings importantes.
2. No descargar/ejecutar GDScript remoto de orígenes no confiables. Limitar recursos, payloads y permisos; controles de sandbox según plataforma.
3. Para menores, moderación y chats, prever privacidad, protección de datos, política de comunidad y mecanismos de reporte/bloqueo; regulación aplicable según producto.
4. Secretos solo en backend/servicios de infraestructura. Ni API keys privilegiadas ni credenciales de base de datos embebidas en `project.godot`, recursos o export.

## Implementación de referencia

```text
Cliente Godot (NO CONFIABLE)
   └─ solicitud de compra {item_id, idempotency_key}
      └─ API HTTPS (auth, límites, autorización, antifraude)
         └─ transacción + tabla de compras/ledger del backend
            └─ respuesta validada para UI Godot
```

Los usuarios podrán inspeccionar/mutar el cliente; nunca autorizar pago desde el código GDScript.

## Verificación obligatoria

- [ ] Repetir una compra o RPC 100 veces: efecto concedido una sola vez.
- [ ] Intentar usar token de otro jugador o IDs no autorizados.
- [ ] Revisar fuga de PII en logs y crash reports.

## Casos adversarios y revisión

- ❌ «Anticheat» sólo ofuscando GDScript.
- ❌ Guardar tokens maestros del servidor en assets exportados.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — high level multiplayer](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html)
- [Godot — http request class](https://docs.godotengine.org/en/stable/tutorials/networking/http_request_class.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Obfuscar binario y asumir seguridad de economía
- **❌ Incorrecto**: Obfuscar binario y asumir seguridad de economía.
- **✅ Correcto**: Servidor autoritativo y checks de transacción.

### 02. Permitir mods con acceso a archivos privados sin límites
- **❌ Incorrecto**: Permitir mods con acceso a archivos privados sin límites.
- **✅ Correcto**: Sandbox/consentimiento y separación de datos cuando sea posible.

### 03. Registrar IP/tokens enteros en analytics sin justificación
- **❌ Incorrecto**: Registrar IP/tokens enteros en analytics sin justificación.
- **✅ Correcto**: Minimización, retención y consentimiento.

### 04. Aceptar assets remotos sin verificar tamaño/tipo
- **❌ Incorrecto**: Aceptar assets remotos sin verificar tamaño/tipo.
- **✅ Correcto**: Límites, validación y aislamiento de contenido.

### 05. Considerar reporte anti-cheat suficiente con ban automático
- **❌ Incorrecto**: Considerar reporte anti-cheat suficiente con ban automático.
- **✅ Correcto**: Evidencia, apelación y errores falsos positivos.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.
