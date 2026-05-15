# Laravel/PHP — clases, enums, configuración y contratos por feature

**Owner:** `stacks/backend/laravel/` y [regla transversal](../../../../standards/engineering/file-and-symbol-ownership.md). Usar convenciones PHP/Laravel, no copiar `types/` de TypeScript.

```text
app/Domain/Auth/
├── Enums/SessionState.php
├── Contracts/PasswordHasher.php
├── Actions/AuthenticateUser.php
└── Exceptions/InvalidCredentials.php
app/Infrastructure/Auth/ArgonPasswordHasher.php
app/Http/Requests/Auth/SignInRequest.php
config/auth.php
```

- `config/auth.php`/config dedicado (nunca credenciales en código); acceder mediante `config()` e inyectar lo que requiera tests. Password hashing debe respetar Hash facade/driver disponible; migrar algoritmo con rehash controlado.
- `Interfaces` semánticas se llaman `Contracts`/`Ports`; no crear archivos `Types` para cualquier array. Preferir DTO/enums/objetos de valor para fronteras con invariantes.
- `const` de PHP en clase o enum está bien si es identidad local; compartir solo si varios módulos comparten semántica estable. No convertir toda propiedad de configuración a `Consts.php` global.
- `Services` o `Actions` orquestan; Eloquent/ORM no filtra reglas de dominio fuera de límites deliberados.
- Auth tests: PHPunit/Pest, sesión, CSRF, throttling, guard, policies, errores indistinguibles; ejecutar bajo versión Laravel/driver real.

**Incorrecto:** trasladar convenciones GDScript `autoload` o `Rust traits` a PHP por analogía; colocar todo bajo `app/Helpers/` y perder propietario.

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Emplear Contracts/Actions/Enums por feature y config Laravel validada.
- ❌ **Incorrecto:** Crear `Types/` al estilo TS y esconder claves en Constants.php.
