# C++ Core — golden path compilable (sin Qt)

Biblioteca estática C++20 con errores representados mediante `std::optional`, sin asignación manual de memoria ni dependencias Qt. Un test `CTest` cubre casos válidos e inválidos.

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug -DBUILD_TESTING=ON
cmake --build build --parallel
ctest --test-dir build --output-on-failure
```

✅ Correcto: C++ Core compila independientemente de Qt. ❌ Incorrecto: afirmar que este test valida navegación Qt WebEngine o una UI Desktop.
