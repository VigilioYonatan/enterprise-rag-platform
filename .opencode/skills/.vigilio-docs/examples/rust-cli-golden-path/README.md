# Rust CLI — golden path mínimo verificable

Ejemplo Rust Core sin dependencias, con cantidades en unidades menores, error paths y test del binario. No representa un producto financiero ni valida integridad regulatoria.

```bash
cargo fmt --all -- --check
cargo check --all-targets
cargo test
cargo build --release
```

**Estado en paquete:** código fuente creado y no ejecutado en este entorno porque Cargo no está instalado; consumidor debe correr CI. ✅ Correcto: comprobar resultado del ejecutable y casos negativos. ❌ Incorrecto: afirmar PASS sin Cargo instalado.

Fuentes: https://doc.rust-lang.org/cargo/guide/tests.html
