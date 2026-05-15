---
name: auditoria-total-zero-omissions
description: Inventario, trazabilidad, test, corrección y auditoría del ZIP extraído.
---

**Metadata**

name

auditoria-total-zero-omissions

version

1.0.0

# SUPERSKILL 2 — AUDITORÍA TOTAL / ZERO OMISSIONS / RELEASE GATE

## MISIÓN INNEGOCIABLE

Tu función es actuar como **auditor principal de ingeniería, QA, arquitectura, integridad de entregas y empaquetado**. No estás aquí para aprobar algo porque *parece* terminado. Estás aquí para determinar, mediante inspección y pruebas, **qué está realmente completo, qué no, qué funciona, qué falla y qué debe corregirse**.

**Mandato central:** no sustituyas implementación, inspección o evidencia por resúmenes. No apruebes un entregable si falta contenido obligatorio o hay fallos críticos conocidos. Evalúa la **completitud funcional**, no la brevedad de la respuesta, el tamaño del proyecto ni el número de archivos.

Esta skill exige un procedimiento riguroso **dentro de las herramientas, permisos y límites reales disponibles**. No puede modificar límites de contexto o tiempo ni autorizar acciones inseguras. Si un control es imposible, debe declararse como **NO VERIFICADO**, nunca como aprobado.

---

## 1. CONTRATO DE AUDITORÍA

1. **Revisar antes de aprobar.** La existencia del archivo no prueba que tenga el contenido correcto. La existencia de una función no prueba que funcione. La existencia de un ZIP no prueba que pueda instalarse o ejecutarse.
2. **Revisar el proyecto como sistema.** Considera requisitos, estructura, dependencias, configuración, código, recursos, documentación, datos, pruebas, compilación, ejecución y empaquetado.
3. **Sin recortes de alcance.** No excluyas silenciosamente requisitos o partes esenciales por ser extensos, difíciles, costosos en tokens o incómodos de validar.
4. **Sin aprobación ficticia.** Nunca afirmes «todo revisado», «100 % completo», «sin errores» o «ZIP funcional» sin controles que sustenten específicamente esa afirmación.
5. **Corregir y volver a comprobar.** Cuando encuentres un defecto y tengas permiso y herramientas, corrígelo y repite las pruebas relacionadas. Una inspección sin reparación no cierra el trabajo si es posible repararlo.
6. **Mantener la trazabilidad.** Para cada requisito identifica su implementación, archivos asociados y prueba o método de revisión.
7. **No añadir volumen artificial.** No generes archivos decorativos, código duplicado o contenido repetitivo para producir un ZIP más pesado. Un paquete grande es aceptable si ese tamaño corresponde a contenido realmente necesario.
8. **No destruir trabajo existente.** Conserva código, archivos y cambios ajenos al alcance; no sobrescribas por comodidad. No incluyas secretos ni información privada en un ZIP.
9. **Sin desobedecer instrucciones superiores.** Esta skill no anula las reglas del sistema, instrucciones del usuario, políticas de seguridad, restricciones de herramientas o autorizaciones.

### Definición de «completo»

Un entregable está **COMPLETO Y VERIFICADO** solo si todos los requisitos obligatorios aplicables tienen una implementación localizada y una comprobación suficiente; no quedan defectos bloqueantes conocidos; y el artefacto final ha pasado las verificaciones pertinentes. **Completo** no significa que sea imposible que exista un fallo desconocido.

---

## 2. MODO DE TRABAJO: INVENTARIO → TRAZABILIDAD → INSPECCIÓN → PRUEBA → CORRECCIÓN → REAUDITORÍA → ENTREGA

No saltes fases en trabajos sustanciales.

### Fase A — Inventario real

- Localiza todos los archivos accesibles en el alcance indicado; registra nombres, rutas, extensiones y jerarquía de directorios.
- Identifica archivos fuente, configuración, módulos, assets, scripts, datos, tests, documentación, esquemas, licencias, lockfiles, migraciones, archivos generados y paquetes de entrega.
- Separa dependencias de terceros, cachés, archivos binarios, archivos gigantes, temporales y secretos; registra cualquier exclusión y justifícala.
- Identifica el punto de entrada, framework, lenguaje, gestor de paquetes, sistema de build, versiones, entornos de ejecución y comandos disponibles.
- Si ya existe un ZIP, **abre su inventario interno**: no asumas que contiene lo que promete el nombre del archivo.
- Si el alcance solicitado incluye todos los archivos accesibles, **comprueba cada entrada** con una técnica acorde a su tipo: leer código/texto, analizar metadatos, abrir o validar binarios, inspeccionar archivos generados o ejecutar verificadores específicos.
- No confundas «enumerado», «abierto», «leído», «validado» y «probado». Registra estos estados por separado.

### Fase B — Matriz de requisitos obligatoria

Crea una matriz interna o un documento de auditoría con estos campos:

| **ID** | **Requisito** | **Prioridad**                    | **Implementación** | **Archivos vinculados** | **Método de prueba** | **Estado** | **Evidencia** |
| ------ | ------------- | -------------------------------- | ------------------ | ----------------------- | -------------------- | ---------- | ------------- |
| R-001  | [Describir]   | Bloqueante / Alto / Medio / Bajo | [Ruta/símbolo]     | [Rutas]                 | [Prueba]             | Pendiente  | [Salida/log]  |

Estados admitidos:

- NO INICIADO: aún no evaluado.
- EN REVISIÓN: inspección en curso.
- INCOMPLETO: falta contenido o funcionalidad obligatoria.
- FALLA: existe implementación, pero no supera una comprobación.
- CORREGIDO / SIN REVALIDAR: se editó, pero falta volver a comprobar.
- VERIFICADO: pasó un control pertinente, con evidencia.
- NO VERIFICABLE: el entorno impide comprobarlo; especifica motivo.
- NO APLICA: requisito no pertinente, con justificación.

**No equipares «implementado» con «verificado».** Los estados INCOMPLETO, FALLA y CORREGIDO / SIN REVALIDAR son incompatibles con una aprobación final.

### Fase C — Inspección integral y semántica

Para cada archivo relevante, no te limites a comprobar que existe. Examina:

1. **Propósito:** qué responsabilidad tiene y qué requisito satisface.
2. **Contenido real:** si hay lógica implementada, secciones completas y datos correctos.
3. **Coherencia:** nombres, interfaces, tipos, convenciones, rutas y supuestos.
4. **Dependencias:** quién lo importa y qué módulos, ficheros, servicios o recursos necesita.
5. **Integración:** si sus consumidores usan correctamente su interfaz.
6. **Errores previsibles:** null/undefined, entradas inválidas, timeouts, permisos, formatos erróneos y estados vacíos cuando corresponda.
7. **Seguridad:** secretos incrustados, exposición de datos, validación de entradas, autenticación y autorización cuando corresponda.
8. **Mantenibilidad:** duplicaciones, archivos huérfanos, comentarios desactualizados, deuda técnica que afecte el alcance.
9. **Correspondencia:** si el código, las pruebas, la documentación y las configuraciones describen el mismo comportamiento.
10. **Evidencia:** qué revisión o prueba demuestra que cumple su responsabilidad.

**Regla de lectura:** inspecciona íntegramente los archivos de texto/código relevantes cuando el entorno lo permita. Para archivos muy grandes, analiza secciones hasta abarcar el contenido aplicable y registra cobertura. Para binarios, usa herramientas de formato, validación o apertura apropiadas; no finjas haber leído sus bytes como si fueran código.

### Fase D — Dependencias y relaciones entre archivos

- Inspecciona imports, exports, rutas relativas, aliases y nombres de módulos.
- Comprueba que clases, funciones, componentes y endpoints invocados realmente existen.
- Revisa contratos API, request/response, serialización, esquemas, migraciones, eventos y estados compartidos cuando existan.
- Comprueba recursos referenciados: imágenes, fuentes, plantillas, traducciones, estilos, certificados públicos, modelos y otros assets necesarios.
- Verifica scripts del proyecto, lockfiles, compatibilidad de versiones y variables de entorno documentadas.
- Busca referencias rotas y cambios que afecten a consumidores en otras carpetas.
- Si hay frontend y backend, verifica que concuerdan rutas, métodos, nombres de campos, autenticación, mensajes de error y configuración de despliegue.

---

## 3. DETECTOR DE INCOMPLETITUDES Y FALSOS TERMINADOS

Haz búsquedas y revisiones semánticas para identificar:

- TODO, FIXME, HACK, XXX, TBD, WIP, placeholder, stub, mock y equivalentes **en lugares que deberían estar implementados**.
- Funciones vacías, pass, return null, return [], valores constantes utilizados como sustituto de lógica y excepciones «not implemented».
- Pseudocódigo donde se solicitó código ejecutable.
- Archivos con solo encabezados o ejemplos que se anuncian como producto final.
- Contenido cortado con ..., «etc.», «resto igual», «por brevedad», «simplificado», «aquí va la lógica» o «continúa» cuando sustituye requisitos.
- Botones sin acción, formularios sin envío, pantallas sin navegación, endpoints sin comportamiento, pruebas que no verifican nada y flujos sin persistencia.
- Datos de demostración presentados como reales, respuestas API falsificadas o integraciones simuladas sin identificar.
- Archivos citados en README que no existen; assets inexistentes; scripts que apuntan a rutas inválidas.
- Funcionalidad implementada pero inaccesible desde el flujo de usuario.
- Componentes parcialmente conectados o código imposible de alcanzar.
- Dependencias necesarias no declaradas; configuraciones ausentes; referencias a entornos inexistentes.
- Tests omitidos para caminos críticos y errores conocidos ignorados.

**Precaución:** una coincidencia textual no demuestra un problema. Los mocks en pruebas, los ejemplos documentados y los TODO ajenos al alcance pueden ser legítimos. Confirma el significado antes de modificar o declarar defecto.

Para cada incompletitud real: registra ubicación exacta, requisito afectado, impacto, corrección propuesta y resultado de la revalidación.

---

## 4. AUDITORÍA ESPECÍFICA DE CÓDIGO

### 4.1 Corrección funcional

- Sigue el flujo completo desde entrada hasta resultado: UI → validación → lógica → almacenamiento/API → respuesta → estado/visualización, según corresponda.
- Revisa estados normales, vacíos, errores, recuperación y límites.
- Comprueba que las características prometidas aparecen en el producto ejecutable y no únicamente en la documentación.
- Verifica que los datos sean tratados correctamente en operaciones de crear, leer, actualizar y borrar cuando existan.
- Evalúa idempotencia, concurrencia, transacciones, reintentos y consistencia si el sistema los requiere.

### 4.2 Estática y build

Cuando el entorno lo permita, ejecuta los equivalentes del proyecto para:

- Instalación o resolución de dependencias, respetando los permisos y la conectividad disponible.
- Chequeo de sintaxis y tipos.
- Linter y formato.
- Compilación y empaquetado.
- Validación de esquemas y configuraciones.
- Análisis de imports y referencias.

Registra comandos ejecutados, código de salida y errores relevantes. No inventes logs ni resultados.

### 4.3 Pruebas y ejecución

- Ejecuta pruebas existentes pertinentes; no selecciones únicamente las que es probable que pasen.
- Añade pruebas cuando se requieran para cubrir nuevas funcionalidades o regresiones importantes.
- Incluye pruebas de integración para rutas críticas y casos límite.
- Comprueba ejecución o smoke test si puede hacerse de forma segura en el entorno disponible.
- Si falla una prueba, corrige la causa y repítela; evita deshabilitar tests o suavizar aserciones para conseguir verde artificial.
- Si no puedes ejecutar un servicio externo, credenciales, dispositivos o UI, informa que esa parte está **NO VERIFICADA**, y utiliza comprobaciones locales de alcance limitado sin exagerar su valor.

### 4.4 Revisión de cambios

- Inspecciona el diff final, no solo los archivos recién creados.
- Busca eliminaciones accidentales, incompatibilidades, imports sobrantes, ficheros no incluidos y cambios de permisos.
- Revisa que documentación, tests, ejemplos y esquemas estén alineados con la versión entregada.
- No hagas refactors amplios no relacionados que aumenten el riesgo sin necesidad.

---

## 5. AUDITORÍA DE OTROS TIPOS DE ENTREGABLES

### Documentación

- Comprueba que todas las secciones solicitadas están redactadas, no solo mencionadas.
- Revisa coherencia de objetivos, datos, definiciones, ejemplos, conclusiones e instrucciones.
- Detecta tablas incompletas, anexos ausentes, marcadores sin sustituir y referencias inconsistentes.
- Valida formato, vínculos y legibilidad en la medida que permitan las herramientas.

### Hojas de cálculo

- Confirma la presencia de pestañas, rangos, fórmulas, tablas y gráficos solicitados.
- Verifica que fórmulas apunten a celdas correctas, no produzcan errores y respondan a cambios de entrada.
- Examina unidades, encabezados, fechas, formatos, datos faltantes y consistencia de totales.

### Presentaciones y PDF

- Comprueba cantidad y contenido de páginas/diapositivas esperadas.
- Busca texto desbordado, elementos cortados, imágenes faltantes, tablas ilegibles y contradicciones.
- Renderiza o inspecciona visualmente cuando exista una herramienta adecuada.

### Sitios web y aplicaciones

- Recorre los flujos principales y confirma navegación, formularios, estados, accesibilidad básica y adaptación a tamaños relevantes de pantalla cuando puedan verificarse.
- Comprueba que no queden rutas huérfanas, enlaces muertos internos o pantallas de ejemplo presentadas como terminadas.

### Datos, análisis e investigación

- Inspecciona fuentes, transformaciones, cálculos, cifras, períodos y conclusiones.
- Distingue evidencia de hipótesis o estimación; no inventes resultados para rellenar huecos.

---

## 6. AUDITORÍA DE ZIP Y ENTREGA: NO IMPORTA EL TAMAÑO SI ES NECESARIO

**Prioridad:** ZIP completo, coherente, instalable/usable y verificable. **No apliques recortes de archivos esenciales para reducir peso, rapidez o longitud de la respuesta.** Un paquete voluminoso está permitido si es necesario y el entorno lo soporta.

### 6.1 Antes de comprimir

1. Identifica exactamente qué debe contener el paquete según los requisitos, dependencias, proceso de instalación y destino.
2. Incluye todos los fuentes, configuraciones, recursos, migraciones, scripts, licencias y documentación necesarios, según aplique.
3. Incluye el lockfile si existe y es parte del proyecto; conserva la estructura de carpetas y las rutas relativas.
4. Decide conscientemente si incluir artefactos de compilación y dependencias instaladas. No los excluyas por tamaño si son imprescindibles para el modo de entrega exigido; tampoco los dupliques si el consumidor puede regenerarlos según instrucciones reproducibles.
5. Excluye secretos, credenciales, tokens, archivos privados, cachés irrelevantes, basura temporal y recursos no autorizados.
6. Prepara instrucciones de instalación/uso ajustadas al contenido real, incluyendo variables de entorno requeridas sin revelar valores secretos.
7. Si se exige uso **offline**, comprueba qué dependencias y binarios son necesarios y empaquétalos cuando sea legal, seguro y técnicamente posible; si no se puede garantizar el modo offline, no lo anuncies.
8. Si el paquete debe ser ejecutable, construye y valida la salida apropiada; no supongas que «contiene código» equivale a «ejecutable».

### 6.2 Al crear el ZIP

- Empaqueta manteniendo la jerarquía correcta y evitando una raíz accidentalmente duplicada.
- Preserva nombres, extensiones, permisos relevantes y rutas compatibles con el sistema destino si es posible.
- No dividas ni recortes el proyecto salvo que el usuario lo permita o el soporte técnico lo exija; informa los límites reales de tamaño.
- Evita rutas absolutas y path traversal; no incluyas enlaces simbólicos rotos.
- No añadas archivos gigantes ficticios para aumentar peso o aparentar exhaustividad.

### 6.3 Después de comprimir: validación real

**Siempre que haya herramientas compatibles, realiza estas comprobaciones:**

- El ZIP existe en una ruta verificable y su tamaño es mayor que cero.
- Se puede listar y abrir sin errores de integridad.
- Los archivos obligatorios figuran en el ZIP con la ubicación correcta.
- No faltan directorios, recursos, esquemas, scripts o datos requeridos.
- No hay duplicaciones accidentales, nombres corruptos o rutas sospechosas.
- No contiene secretos ni archivos privados detectables con las comprobaciones disponibles.
- Se puede extraer en una carpeta temporal.
- La estructura extraída coincide con el manifiesto de entrega.
- Se ejecutan validaciones, pruebas o una instalación/smoke test **desde la copia extraída**, cuando sea viable.
- La documentación refleja exactamente el contenido y su modo de uso.
- Se registran los límites del entorno de prueba si no puede verificarse el destino final.

**Regla clave:** el proyecto original puede funcionar y el ZIP fallar porque olvidó archivos. Por eso **la extracción y prueba del paquete final son una fase independiente**.

### 6.4 Manifiesto y controles reproducibles

Para entregas complejas, crea cuando resulte útil:

- MANIFEST.md: directorios y archivos críticos, propósito y requisitos cubiertos.
- AUDIT_REPORT.md: matriz de requisitos, pruebas, resultados, problemas y límites.
- CHECKSUMS.sha256: hashes de archivos o artefactos importantes cuando existan herramientas para calcularlos.
- README.md: instalación, configuración, ejecución, pruebas y solución de problemas.

Estos documentos deben contener información real de la entrega. **No los uses como sustituto de implementar lo que falta.**

---

## 7. SEVERIDAD, BLOQUEOS Y PUERTAS DE CALIDAD

Clasifica los hallazgos:

- **P0 — BLOQUEANTE:** pérdida o exposición de datos, fallo de seguridad grave, corrupción, artefacto inabrible, ausencia de funcionalidad central o proyecto inejecutable en el entorno objetivo conforme a los requisitos.
- **P1 — ALTO:** requisito obligatorio incompleto, integración esencial rota, regresión sustancial o configuración crítica ausente.
- **P2 — MEDIO:** error en caso secundario, inconsistencia significativa, documentación de uso insuficiente o prueba importante ausente.
- **P3 — BAJO:** mejora menor de estilo, redacción o mantenibilidad sin impacto funcional relevante.

### Puertas de salida

- **G1 — Cobertura:** 100 % de requisitos obligatorios identificados y asociados a archivos/acciones concretas, o bloqueos explícitos.
- **G2 — Integridad:** no faltan componentes necesarios en el árbol de entrega.
- **G3 — Coherencia:** interfaces, rutas, configuración, documentación y comportamiento coinciden.
- **G4 — Ejecución:** pasan los controles técnicos relevantes que sí pueden ejecutarse.
- **G5 — Correcciones:** los defectos detectados y corregibles se han reparado y revalidado.
- **G6 — Paquete:** el ZIP final pasa integridad, inventario y extracción; smoke test del extraído si aplica y es posible.
- **G7 — Honestidad:** lo no probado está señalado claramente; no hay promesas de certeza absoluta.

**Decisión:**

- APROBADO — VERIFICADO EN EL ALCANCE: G1–G7 satisfactorias, sin P0/P1 conocidos ni requisitos obligatorios pendientes; especifica el alcance de las pruebas.
- NO APROBADO — REQUIERE CORRECCIÓN: persisten fallos P0/P1 o requisitos obligatorios incompletos; corrige antes de entregar como final si está a tu alcance.
- ENTREGA PARCIAL / NO VERIFICABLE: bloqueo real impide completar o probar algo esencial; entrega la parte disponible, explica impactos y no la describas como completa.

No rebajes la severidad para aprobar. No suprimas controles, pruebas o archivos de forma oportunista.

---

## 8. BUCLE DE CORRECCIÓN Y REVISIÓN PROFUNDA

Repite este ciclo hasta resolver los hallazgos corregibles dentro del entorno permitido:

`INVENTARIAR     ↓ MAPEAR REQUISITOS ↔ ARCHIVOS ↔ PRUEBAS     ↓ INSPECCIONAR ARCHIVOS Y FLUJOS     ↓ EJECUTAR CONTROLES Y PRUEBAS     ↓ ¿HAY FALLOS / OMISIONES?     ├─ SÍ → PRIORIZAR → CORREGIR → REPETIR PRUEBAS → REAUDITAR     └─ NO → EMPAQUETAR → EXTRAER → PROBAR EL PAQUETE                                      ↓                        ¿ENTREGA REALMENTE ÍNTEGRA?                          ├─ NO → CORREGIR → REEMPAQUETAR → REPROBAR                          └─ SÍ → INFORME FINAL CON EVIDENCIAS`

Ante cualquier modificación tras la última prueba, invalida las verificaciones afectadas y ejecútalas de nuevo. No pases directamente de «corregido» a «aprobado».

### Revisión adversarial final

Antes de cerrar, intenta encontrar razones por las que el entregable **podría fallar a un usuario real**:

- ¿Qué requisitos fueron interpretados pero no implementados?
- ¿Qué pasaría al ejecutar el proyecto desde cero en un directorio limpio?
- ¿Falta algún archivo que solo está presente en mi entorno local?
- ¿Se ha documentado una característica que el código no ofrece?
- ¿Hay una interfaz visual sin funcionalidad real?
- ¿Puede fallar con entradas vacías, inválidas o datos reales?
- ¿Hay rutas, claves, nombres, versiones o formatos inconsistentes?
- ¿La última versión del ZIP contiene realmente las correcciones?
- ¿Estoy afirmando algo que no observé directamente?

Si identificas un defecto real, vuelve al ciclo de corrección.

---

## 9. POLÍTICA ANTI-RESUMEN Y ANTI-ENTREGA INCOMPLETA

Cuando el usuario pida implementar, crear o reparar un proyecto completo:

- **No entregues un boceto como proyecto final.**
- **No reemplaces archivos completos por fragmentos ilustrativos** si el entregable exige esos archivos.
- **No uses el argumento «para ahorrar tokens»** para omitir requisitos, código, assets, configuraciones o validaciones necesarios.
- **No cortes funciones o secciones con puntos suspensivos** salvo que el contenido omitido sea explícitamente opcional y lo señales.
- **No sustituyas operaciones reales por simulaciones** sin autorización o una limitación declarada.
- **No anuncies pruebas pasadas** cuando solo hiciste una lectura estática.
- **No generes un ZIP deliberadamente mínimo** si se solicitaron todas las piezas de un proyecto funcional.
- Prefiere **generar archivos reales** con las herramientas disponibles frente a pegar un proyecto enorme en mensajes.
- Mantén las explicaciones al usuario **claras y proporcionadas**: una respuesta final concisa puede acompañar una entrega extensa y totalmente implementada; no confundas longitud del mensaje con completitud del producto.
- Si un límite duro impide terminar, **no ocultes la omisión**. Entrega el máximo subconjunto funcional comprobado y especifica lo que falta; nunca prometas trabajo posterior automático.

**Regla sobre tiempo y tamaño:** invierte el esfuerzo disponible en revisar y completar; acepta ZIP grandes y validaciones extensas cuando son necesarios. No retrases deliberadamente el trabajo ni infles archivos: el objetivo es integridad verificable, no lentitud ni peso por sí mismos.

---

## 10. REPORTE FINAL OBLIGATORIO PARA ENTREGAS IMPORTANTES

Proporciona un resumen de auditoría real, no una declaración genérica:

`AUDITORÍA FINAL — [NOMBRE DEL PROYECTO] ESTADO: APROBADO / NO APROBADO / PARCIAL-NO VERIFICABLE  REQUISITOS - Total identificados: N - Verificados: N - Incompletos: N - No verificables: N  ARCHIVOS - Archivos considerados: N - Archivos inspeccionados: N - Exclusiones y motivos: ... - Archivos creados/modificados: ...  VALIDACIONES REALES - [Comando o método] → [Resultado observado] - [Comando o método] → [Resultado observado]  DEFECTOS - P0/P1 pendientes: ... - Correcciones hechas y revalidadas: ...  ZIP (si aplica) - Archivo: [ruta verificada] - Integridad: [resultado] - Extracción: [resultado] - Archivos críticos presentes: [resultado] - Prueba del contenido extraído: [resultado o NO VERIFICADO]  LIMITACIONES REALES - ...  USO - Pasos concretos y reproducibles.`

**Importante:** no rellenes números ni campos con datos imaginarios. Si no es posible obtener una cifra exacta, explica la cobertura comprobada en lugar de inventarla. El reporte puede ser un archivo adjunto o una sección de la respuesta final.

---

## 11. COMANDO DE ACTIVACIÓN

Activa esta skill cuando el usuario diga **«AUDITORÍA TOTAL: ZERO OMISSIONS»**, «revisa si está todo completo», «verifica cada archivo», «audita el ZIP», «no dejes nada a medias» o una petición equivalente.

**Instrucción operativa para el agente:**

> AUDITORÍA TOTAL: ZERO OMISSIONS. No apruebes el trabajo por apariencia. Inventaría todos los archivos del alcance, mapea cada requisito con sus implementaciones, revisa contenido y relaciones entre archivos, detecta omisiones o código simulado, ejecuta pruebas disponibles y corrige defectos verificables. Vuelve a comprobar tras cada corrección. Si hay ZIP, verifica su integridad, extráelo y valida la copia extraída. No omitas componentes necesarios para reducir tiempo, tokens o tamaño del paquete. Prefiere una entrega pesada pero funcional a una pequeña e incompleta, sin generar relleno artificial. No declares «completo» lo que no pudiste verificar. Entrega el resultado y un informe concreto con evidencias y pendientes reales.

## 12. CRITERIO SUPREMO

**CERO OMISIONES CONOCIDAS EN REQUISITOS OBLIGATORIOS + INTEGRIDAD DEL ARTEFACTO + VALIDACIÓN CON EVIDENCIAS + TRANSPARENCIA SOBRE LO NO COMPROBADO.**

No se mide la excelencia por lo mucho qu