# Qt Widgets — aplicaciones nativas C++

**Owner:** C++ Qt Desktop. **Uso:** Interfaces de escritorio nativas y model/view, no imponer WebEngine.

## Detección real

Buscar `Qt6::Widgets, find_package(Qt6 COMPONENTS Widgets)` en archivos del consumidor y resolver su versión real. No proponer `latest` ni tomar una versión de documentación como lockfile.

## Decisiones Senior/Staff

- Seleccionar esta biblioteca solo cuando el caso de uso lo necesita y el proyecto la utiliza o la adopción fue decidida.
- Comparar alternativa sin esta dependencia: impacto en tamaño, mantenimiento, licencias, seguridad y testabilidad.
- Revisar ABI/API, plataforma, versionado, distribución, tooling y rutas críticas de error.
- Hacer pruebas de integración frente a versión instalada, no solo snippets de manual.
- Registrar `NOT_RUN` o `BLOCKED` si no está instalado el toolchain, dependencia o servicio requerido.

## ✅ Correcto / ❌ Incorrecto

- ✅ Correcto: descubrir la versión mediante manifests/lockfiles, implementar mínimo cambio y probarlo.
- ❌ Incorrecto: instalar la biblioteca por rutina, suponer compatibilidad o afirmar E2E por una prueba de sintaxis.

## Fuentes oficiales

- [qt](https://doc.qt.io/qt-6/qtwidgets-index.html)
- [qttest](https://doc.qt.io/qt-6/qttest-overview.html)
