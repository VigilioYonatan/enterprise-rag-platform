# Seeders en DDD - `bus-impl`

Los seeders si son buena practica en DDD, pero no pertenecen al `domain/`.

La regla para este proyecto:

```text
domain/          -> reglas puras de negocio, sin seeders
application/     -> casos de uso, puertos, DTOs
infrastructure/  -> persistencia, Drizzle, seeders y adapters
scripts/         -> entrypoints para ejecutar seeds
```

## Ubicacion

```text
src/
|-- shared/
|   `-- infrastructure/
|       `-- database/
|           |-- seeders/
|           |   `-- seed-runner.ts
|           |-- database.schema.ts
|           `-- database.types.ts
|-- user/
|   `-- infrastructure/persistence/drizzle/user.seeder.ts
|-- product/
|   `-- infrastructure/persistence/drizzle/product.seeder.ts

scripts/
`-- seed-local-db.ts
```

## Comandos

```bash
pnpm db:local:setup # crea bus_impl si falta y aplica migraciones si la DB esta vacia
pnpm db:local:reset # borra/recrea bus_impl local y aplica migraciones
pnpm db:seed:local # prepara DB local y carga datos base idempotentes
```

Credenciales locales generadas:

```text
admin.local@rimac.test / AdminPassword2026!
operador.local@rimac.test / AdminPassword2026!
```

Estas credenciales son solo para desarrollo local y tests manuales. No deben existir en production.

## Reglas

- los seeders viven en `infrastructure`, no en `domain`.
- usar clases `FeatureSeeder` con metodo `run()` por defecto.
- se permite mantener una funcion wrapper `seedFeature(db)` para que scripts y runners sigan simples.
- deben ser idempotentes: correrlos dos veces no debe duplicar usuarios/productos.
- no deben contener reglas complejas de negocio.
- no deben guardar secretos reales.
- no deben borrar datos salvo que el comando sea explicitamente destructivo, como `db:local:reset`.
- no se ejecutan automaticamente en production.
- catalogos productivos deben ir por migracion controlada, approval y datos revisados.

## Que seedear

✅ Correcto:
- usuario admin local.
- usuario operador local.
- productos demo.
- datos minimos para smoke local.
- catalogos base no sensibles cuando aplica.

❌ Incorrecto:
- PII real.
- tokens, claves, refresh tokens o secretos.
- datos productivos anonimizados sin proceso formal.
- seeders que dependen del orden de ejecucion no documentado.
- seeders que esconden bugs de migraciones.

## Relacion con DDD

Un seeder no define comportamiento de negocio. Es un adaptador operativo para preparar entorno.

Por eso puede insertar datos con Drizzle directamente:

```typescript
await db
  .insert(userTable)
  .values({ email: 'admin.local@rimac.test' })
  .onConflictDoNothing({ target: userTable.email });
```

Eso no viola DDD porque vive en infraestructura y no contamina el modelo de dominio.

Patron obligatorio para seeders nuevos:

```typescript
export class ProductSeeder {
  constructor(private readonly db: AppDatabase) {}

  async run(): Promise<void> {
    await this.db.insert(productTable).values(products).onConflictDoNothing({
      target: productTable.sku,
    });
  }
}

export async function seedProducts(db: AppDatabase): Promise<void> {
  await new ProductSeeder(db).run();
}
```

Beneficios:

- se puede inyectar `AppDatabase`, hashers, factories o clocks sin ensuciar scripts.
- se puede testear el seeder aislado.
- mantiene `scripts/seed-local-db.ts` simple.
- deja claro que el seeder es infraestructura, no dominio.

Ejemplos actuales:

- `UserSeeder` crea usuarios locales idempotentes.
- `ProductSeeder` crea productos demo idempotentes.
- `ProductSeeder` crea un product demo idempotente.

## Production

En production:

- no ejecutar `db:seed:local`.
- no crear usuarios admin con password fija.
- si se necesitan catalogos productivos, crear un flujo separado con review, auditoria y rollback.
- si se necesita bootstrap de permisos/roles, hacerlo idempotente y aprobado por plataforma/seguridad.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

