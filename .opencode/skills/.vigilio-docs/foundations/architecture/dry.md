# DRY pragmático: no repetir conocimiento de negocio

DRY significa **no duplicar conocimiento que debe evolucionar conjuntamente**. Dos líneas parecidas no prueban duplicación de intención. En el código aplicar la fuente de verdad más cercana al propietario del concepto; para DRY documental consultar [política de fuentes canónicas](../../governance/documentation-dry-and-ownership.md).

## Reglas y límites

- Extraer políticas repetidas de autorización, tarifas, schemas y tokens si poseen la misma invariante y consumidores reales.
- Un tipo `const` o un temporal local no debe salir automáticamente a `constants/`; solo se mueve si representa política o contrato estable.
- Evitar `shared/` como cajón de utilidades sin owner; compartir dominio solo entre consumidores con el mismo lenguaje ubicuo.
- Preferir cierta duplicación temporal a una abstracción incorrecta que acople dominios distintos; registrar el coste/decisión.
- Primero tests de caracterización, luego refactor; mantener la semántica observable.

Relacionados: [SOLID](solid.md), [DDD](ddd.md), [nombres y límites](../../standards/engineering/naming-and-boundaries.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Copiar validación financiera en React, Nest y backend de pagos
- **❌ Incorrecto**: Copiar validación financiera en React, Nest y backend de pagos.
- **✅ Correcto**: Una política autorizada en servidor y contratos comunes; UI solo guía.

### 02. Extraer todas las líneas repetidas a utils/shared
- **❌ Incorrecto**: Extraer todas las líneas repetidas a utils/shared.
- **✅ Correcto**: Extraer conocimiento repetido con misma razón de cambio, no coincidencias sintácticas.

### 03. Tres DTO HTTP contienen copias divergentes de schema de mismo request
- **❌ Incorrecto**: Tres DTO HTTP contienen copias divergentes de schema de mismo request.
- **✅ Correcto**: Fuente de esquema canónica y tipos derivados por stack cuando son compatibles.

### 04. Forzar una clase base para dos reglas que evolucionan distinto
- **❌ Incorrecto**: Forzar una clase base para dos reglas que evolucionan distinto.
- **✅ Correcto**: Permitir duplicación accidental temporal; extraer cuando se conoce la abstracción correcta.

### 05. Guardar todas las constantes como AUTH_OPTIONS en un service de NestJS
- **❌ Incorrecto**: Guardar todas las constantes como AUTH_OPTIONS en un service de NestJS.
- **✅ Correcto**: Configuración de hash en config/ del feature; servicio depende de port.

### 06. Duplicar token de diseño CSS y XML Godot manualmente
- **❌ Incorrecto**: Duplicar token de diseño CSS y XML Godot manualmente.
- **✅ Correcto**: Fuente de tokens semánticos y adapters específicos, con auditoría de contrastes.

### 07. Centralizar toda la lógica de un juego en GameManager singleton
- **❌ Incorrecto**: Centralizar toda la lógica de un juego en GameManager singleton.
- **✅ Correcto**: Reutilizar escenas/Resources y señales sin estado global injustificado.

### 08. Share module importado por API, UI y build tooling con permisos excesivos
- **❌ Incorrecto**: Share module importado por API, UI y build tooling con permisos excesivos.
- **✅ Correcto**: Dividir contratos de bajo nivel y dependencias dirigidas.

### 09. Duplicar comandos CI similares por copia sin parámetros
- **❌ Incorrecto**: Duplicar comandos CI similares por copia sin parámetros.
- **✅ Correcto**: Script/preset compartido cuando mantiene el mismo contrato y permite versiones.

### 10. Eliminar duplicados a costa de romper ownership/casos borde
- **❌ Incorrecto**: Eliminar duplicados a costa de romper ownership/casos borde.
- **✅ Correcto**: Exigir tests de comportamiento antes/después y decisión ADR.


## Ejemplo implementable y revisión del riesgo
### Ejemplo de extracción de política, no de variables locales

❌ Incorrecto: copiar una política criptográfica en controlador y servicio o mover cada variable temporal a `constants/`.

```ts
// auth.controller.ts
const hashOptions = { memoryCost: 65536, timeCost: 3 }; // duplicación de política
// auth.service.ts
const hashOptions2 = { memoryCost: 32768, timeCost: 2 }; // divergencia accidental
```

✅ Correcto: `auth/config/password-hashing.config.ts` concentra la política; el servicio conserva `const user` local porque **no** es un conocimiento reutilizable.

```ts
// auth/config/password-hashing.config.ts
export const PASSWORD_HASH_COST = Object.freeze({ memoryCost: 65536, timeCost: 3, parallelism: 1 });
// auth/application/auth.service.ts
const user = await this.userRepository.findByEmail(email);
```

La configuración numérica es ilustrativa: calibrar Argon2id para la infraestructura y la política vigente, y usar un adapter de hashing. **No** copiar este objeto parcial directamente como configuración completa de Argon2.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.
