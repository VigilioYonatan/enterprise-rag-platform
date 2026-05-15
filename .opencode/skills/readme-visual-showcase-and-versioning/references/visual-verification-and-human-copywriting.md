# Auditoría Visual Frame-a-Frame y Redacción de README para Cualquier Usuario

---

## 1. Regla de Oro: Revisar Cada Imagen y Cada Frame antes de Publicar

Un script de automatización que finaliza sin excepciones **NO garantiza** que las capturas o los videos sean correctos. Antes de dar por bueno el `README.md`, ejecutar obligatoriamente esta auditoría visual:

### Checklist de Inspección sobre cada `.png` y cada `.gif`
1. **Abrir el 100% de las capturas `.png` generadas:**
   - ¿La ruta era correcta? *(Caso real prevenido: `/docs` devolvía `404 Not Found` porque Scalar vivía en `/reference`).*
   - ¿El elemento clave quedó dentro del encuadre sin ser cortado abajo? *(Caso real prevenido: hacer `scrollTo` antes de fotografiar resultados de búsqueda debajo del formulario).*
   - ¿Hay paneles vacíos que deberían mostrar selección activa? *(Seleccionar un nodo en el editor visual para poblar el Inspector derecho).*
   - ¿Los componentes de terceros respetan Dark Mode? *(Estilizar `.dark .react-flow__minimap` y `.dark .react-flow__node` para evitar cajas blancas brillantes sobre fondo negro).*
2. **Generar y abrir una Lámina de Contacto (`Contact Sheet`) con TODOS los frames de cada `.gif`:**
   - Extraer `Frame 1/N ... Frame N/N` en una cuadrícula PNG y revisar visualmente que la secuencia cuenta una historia continua, sin pantallas en blanco intermedias, sin modales rotos y con el cambio real de estado (ej. de `pending` a `approved`, o de `Dark Mode` a `Light Mode`).
3. **Verificación Automatizada de Enlaces e Imágenes con `curl` (`Zero Broken Links / Images`):**
   - Ejecutar `verify_readme_assets.py` para someter todas las URLs remotas (badges de Shields.io, enlaces de descarga de GitHub, documentación externa) a validación obligatoria con `curl -I -s -f -L` (y fallback `GET --range 0-1024`).
   - Confirmar que ningún badge devuelva 400 (sintaxis rota por guiones no escapados) ni 404/500.
   - Comprobar que todos los assets locales referenciados en el Markdown existan en disco y tengan tamaño mayor a 0 bytes (`st_size > 0`).

---

## 2. Coherencia Exacta entre la Imagen/Video y su Descripción

Cada imagen y cada video corto en el `README.md` debe tener una descripción que cumpla **tres condiciones**:

1. **Veracidad visual 1:1:** Mencionar únicamente lo que realmente aparece en esa captura o ocurre en ese clip (nombres reales visibles como `Autonomous Ticket Triage Pipeline`, `Triage Agent`, `Run da111111`, `Acme Enterprise`).
2. **Orden cronológico en videos:** Si el GIF tiene 4 pasos, la frase introductoria narra esos mismos 4 pasos en el mismo orden en que suceden frente a los ojos del usuario.
3. **Utilidad inmediata:** Explicar qué está logrando el usuario en esa pantalla (ej. *"agrega pasos desde el panel izquierdo, conéctalos en el centro y edita sus ajustes a la derecha"*).

---

## 3. Cómo Escribir un `README.md` para Cualquier Usuario (Cero Jerga Técnica Innecesaria)

Inspirado en **Craft Anything** y **Twenty**, el cuerpo principal del `README.md` debe poder ser leído y disfrutado por **cualquier persona** (un fundador, un cliente evaluando la herramienta, un líder de equipo o un desarrollador):

### Tabla de Traducción: De Jerga Interna a Lenguaje Claro de Producto

| ❌ Evitar en el `README.md` de Usuario | ✅ Escribir Así (Claro para Cualquier Usuario) |
| :--- | :--- |
| *"Orquestador DAG con checkpoints durables lease-locked e idempotency keys sobre JSONB."* | *"Conecta asistentes de IA en flujos visuales paso a paso y consulta el historial completo de cada ejecución."* |
| *"Gate HITL con política `mayDecideApproval` y digest criptográfico SHA-256 anti-TOCTOU."* | *"Cuando una acción toca datos sensibles, el flujo se pausa automáticamente para que otra persona del equipo la revise y apruebe antes de continuar."* |
| *"Búsqueda `hybrid_pgvector_fts_rrf` con `MATERIALIZED CTE` filtrado por `knowledge_document_acl`."* | *"Sube las guías privadas de tu equipo, elige quién puede leer cada documento y encuentra respuestas rápidas con citas a la fuente."* |
| *" Inferencia desacoplada vía puerto `EmbeddingProviderPort` sobre `nomic-embed-text` 768-d."* | *"Funciona con modelos de IA locales en tu propia máquina (vía Ollama), sin necesidad de pagar ni enviar datos a servicios externos."* |

### Estructura Limpia Recomendada (Divulgación Progresiva)
1. **Hero Centrado (`<div align="center">`)**: Logo adaptable `<picture>`, título corto, barra de navegación simple, pitch humano en 2 líneas, badges claros (`version 0.1.0-beta`, `status public beta`, plataformas, `100% Self-Hosted`, `Dark & Light`), botones `DOWNLOAD v0.1.0-beta` + `WATCH QUICK DEMOS`, captura Hero y pie de foto natural.
2. **Nota de Privacidad / Estado (`> [!NOTE]`)**: 2 líneas sencillas explicando qué significa la versión actual (`0.1.0-beta`) y que los datos permanecen en el servidor del usuario.
3. **Why Teams Use It (3–4 bullets claros)**.
4. **See How It Works (2–3 videos cortos `.gif` + enlace al `.webm` HD)** con explicación paso a paso en palabras simples.
5. **Dark & Light Mode** (comparativa visual en 2 columnas).
6. **What's Inside** (cuadrícula visual de 2 columnas recorriendo las pantallas reales con pies de foto fieles).
7. **Download & Get Started** (paso 1: descargar `0.1.0-beta` ZIP o clonar tag; paso 2: levantar con Docker en 2 comandos).
8. **Bloque desplegable `<details>` para Desarrolladores y Contribuidores**: Mapa de carpetas, ejecución local sin Docker, tests automatizados y enlace a `architecture/`.
9. **Common Questions (FAQ breve en lenguaje cotidiano)**.
