# Design System, UI Y Tokens Frontend

## Objetivo

Definir cómo construir UI consistente, accesible y reutilizable sin mezclar componentes visuales con negocio, APIs o DTOs.

## Dos niveles de UI

```text
features/{feature}/components/ui/
  -> UI privada de una feature

libs/ui/
  -> primitivas compartidas por dos o más features/apps
```

Una pieza empieza dentro de la feature. Solo se promueve a `libs/ui` cuando:

1. existen al menos dos consumidores reales;
2. su API no usa nombres de negocio;
3. no importa servicios, hooks de dominio ni contratos HTTP;
4. tiene estados accesibles de disabled, loading, error y focus cuando aplique;
5. sus pruebas protegen comportamiento observable.

No promover un panel completo, una página, un formulario atado a un DTO ni una tabla acoplada a un response concreto.

## Capas de tokens

```text
primitives
  -> semantic tokens
    -> component tokens
      -> componentes
```

- `primitives`: escalas de color, espacio, tipografía, radius, sombras y motion.
- `semantic`: `surface`, `content`, `border`, `focus`, `danger`, `success` y estados equivalentes.
- `component`: tokens específicos de un componente solo cuando la variación no se expresa con semántica.

Reglas:

- Los componentes consumen tokens semánticos, no hexadecimales dispersos.
- Dark mode o temas cambian tokens, no duplican componentes.
- Los tokens no contienen nombres de backend, marcas de dominio ni URLs.
- Contraste, focus y reduced motion se validan en cada tema soportado.

## Estructura recomendada

```text
libs/ui/src/
|-- tokens/
|   |-- primitives.css
|   |-- semantic.css
|   `-- themes.css
|-- button/
|   |-- button.tsx
|   `-- button.test.tsx
|-- form-field/
|   |-- form-field.tsx
|   `-- form-field.test.tsx
|-- data-table/
|   |-- data-table.tsx
|   `-- data-table.test.tsx
`-- index.ts
```

No crear carpetas vacías. Cada archivo runtime escrito a mano tiene una prueba adyacente; `index.ts` solo reexporta y se verifica mediante el consumo público de la librería. CSS y tokens se verifican con build, contraste y visual regression.

## API de componentes

Una API reusable debe ser pequeña y semántica:

```tsx
<Button
  loading={isSaving}
  onClick={handleSave}
  variant="primary"
>
  Guardar
</Button>
```

❌ Incorrecto:
- props booleanas combinatorias sin límite;
- nombres de negocio como `isRegisterProduct` en `libs/ui`;
- componentes que llaman HTTP o invalidan caché;
- defaults que ocultan errores de accesibilidad;
- estilos inline repetidos sin token.

## Accesibilidad obligatoria

- Preferir HTML nativo antes que roles manuales.
- Cada control tiene nombre accesible.
- Errores se asocian con `aria-describedby`.
- Focus visible y orden de teclado verificable.
- Dialogs restauran focus y cierran con Escape cuando corresponde.
- Estados no dependen solo del color.
- Touch targets y zoom no se bloquean.
- `prefers-reduced-motion` se respeta.

axe ayuda, pero no reemplaza teclado, lector de pantalla ni revisión humana.

## Formularios y tablas

`libs/ui` puede exponer controles y layout, pero no conoce React Hook Form, DTOs ni TanStack Query. La feature conecta esos adapters:

```text
features/users/components/register-user.tsx
  -> libs/ui/form-field
  -> React Hook Form + registerUserRequestDto
```

Una tabla genérica recibe columnas y filas ya preparados. La feature conserva API, query, filtros e invalidación.

## Tests y evidencia

- Componente runtime: test adyacente de keyboard, focus, estados y eventos.
- Token/tema CSS: build, contraste y visual regression.
- API pública de `libs/ui`: test de comportamiento, no snapshot masivo de DOM.
- Cambios visibles: revisar snapshots manualmente.
- No aprobar una regresión visual solo porque el snapshot fue actualizado.

## Definition of Done

- La pieza está en la feature correcta o cumple criterios de promoción a `libs/ui`.
- No contiene HTTP, DTOs de negocio ni reglas de dominio.
- Tokens semánticos y temas pasan contraste.
- Tiene nombre accesible, teclado, focus y estados definidos.
- Tiene tests útiles y visual evidence cuando el riesgo lo justifica.
- Build, typecheck, lint y bundle budget permanecen verdes.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Design System, UI Y Tokens Frontend

✅ **Correcto:** Para **Design System, UI Y Tokens Frontend**, usar componentes accesibles y tokens reutilizables con pruebas visuales.

❌ **Incorrecto:** En **Design System, UI Y Tokens Frontend**, copiar configuraciones de diseño de otra plataforma sin medir sus restricciones.

## Especialización UX/UI adicional

- [UX web semántica y performance](uxui-web-performance-accessibility.md).
- [Normas UX/UI canónicas](../../../../standards/experience/README.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Pegar colors hex por componente sin tema
- **❌ Incorrecto**: Pegar colors hex por componente sin tema.
- **✅ Correcto**: Tokens semánticos CSS variables por superficies, estados y contraste.

### 02. Seleccionar Tailwind utilities de marca mezcladas con mensajes de error
- **❌ Incorrecto**: Seleccionar Tailwind utilities de marca mezcladas con mensajes de error.
- **✅ Correcto**: Separar tokens de marca y estados de interacción.

### 03. Copiar componente shadcn sin revisar aria/estados
- **❌ Incorrecto**: Copiar componente shadcn sin revisar aria/estados.
- **✅ Correcto**: Adaptarlo al producto y testear accesibilidad y licencia.

### 04. Introducir motion en todos los botones sin preferencia
- **❌ Incorrecto**: Introducir motion en todos los botones sin preferencia.
- **✅ Correcto**: Respetar prefers-reduced-motion y feedback funcional.

### 05. Cambiar token base sin visual regression de checkout
- **❌ Incorrecto**: Cambiar token base sin visual regression de checkout.
- **✅ Correcto**: Snapshots funcionales y pruebas de rutas críticas.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.
