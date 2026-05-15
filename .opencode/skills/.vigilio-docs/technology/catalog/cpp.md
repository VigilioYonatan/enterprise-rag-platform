# C++ — stack y compatibilidad

**Owner:** C++ Core. **Uso:** CMake, C++20, Qt opcional, libraries, desktop y systems

## Detección real

Buscar `CMakeLists.txt, .cpp, .hpp, CMakePresets.json` en archivos del consumidor y resolver su versión real. No proponer `latest` ni tomar una versión de documentación como lockfile.

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

- [cpp](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [cmake](https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html)
