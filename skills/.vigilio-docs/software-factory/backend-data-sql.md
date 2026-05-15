# Calidad Backend de Datos y SQL

Esta guia es la fuente canonica transversal para consultas y cambios de datos. El dialecto, ORM,
tooling y convenciones fisicas pertenecen al repositorio consumidor.

## Schema y consultas

- Elegir tipo, longitud, nulabilidad, default y precision desde el dominio y los datos reales.
- Parametrizar valores; nunca concatenar input ni hardcodear hosts, IPs, credenciales o valores de
  ambiente en queries o logica de negocio.
- Seleccionar columnas explicitas y aliases claros; evitar `SELECT *` y datos sensibles innecesarios.
- Aplicar limites, orden determinista, paginacion y aislamiento por tenant/ownership cuando corresponda.
- Evitar N+1 y verificar con evidencia antes de afirmar problemas de indice o rendimiento.
- Evitar casts o funciones sobre columnas filtradas cuando destruyan indices; confirmar con el plan real.
- Elegir `UNION ALL`, `UNION`, `COUNT(*)` o `COUNT(1)` por semantica, dialecto y evidencia, no por dogma.
- Mantener binds, nombres y mappers trazables entre query, adapter y tipos de salida.

## Migraciones y cambios de datos

- Usar expand-contract con versiones coexistentes: expandir, desplegar compatibilidad, backfill,
  verificar y contraer despues.
- No renombrar o eliminar una columna usada por la version anterior en el mismo release.
- No actualizar una primary key como operacion ordinaria. Una excepcion exige diseño, FKs,
  compatibilidad, auditoria y recovery probado.
- Partir DML masivo en lotes acotados por tiempo, locks y observabilidad.
- Declarar forward, verificacion y rollback o recovery. Si se destruye informacion, usar backup,
  expand-contract o forward-fix probado; no prometer un `down` ficticio.
- Mantener seeders idempotentes y separados de migraciones estructurales cuando el stack lo soporte.

### Cabecera IC para procedimientos y funciones

Usarla solo cuando el checklist corporativo IC sea autoridad del proyecto. Mantenerla sincronizada con
la firma y el comportamiento; no copiarla en queries ordinarias ni en codigo de aplicacion.

```sql
/*
Nombre SP        : spx_calcular_salario_base
Proposito        : Calcula el salario base aplicando las reglas vigentes del periodo.
Input            : @id_empleado - identificador del empleado.
                   @periodo     - periodo de calculo en formato YYYYMM.
Output           : result set con salario_base y moneda.
Creado por       : equipo-rrhh
Fec Creacion     : 2026-10-11
Fec Actualizacion: 2026-10-11
Actualizado por  : equipo-rrhh
Ticket/Proyecto  : PROY-0042
Detalle cambios  : Implementacion inicial con validacion de periodo activo.
*/
CREATE PROCEDURE rrhh.spx_calcular_salario_base
  @id_empleado bigint,
  @periodo char(6)
AS
BEGIN
  -- El periodo debe existir antes de calcular para evitar resultados parciales.
END;
```

No inventar autor, ticket o fechas. Si la plantilla es obligatoria y faltan datos, registrar la
evidencia pendiente.

### Plan de migracion documentado

```markdown
Cambio: agregar `external_reference` unica a settlements.

Forward:
1. agregar columna nullable e indice no bloqueante;
2. desplegar escritura dual compatible;
3. backfill por lotes con checkpoint;
4. verificar nulos, duplicados, locks y latencia;
5. activar unique/not-null y retirar compatibilidad en otro release.

Recovery:
- antes de contraer: desactivar escritura dual y retirar indice/columna nueva;
- despues de contraer: restaurar backup o aplicar forward-fix probado.

Evidencia: comandos y exit codes, conteos pre/post, duracion, plan y owner operativo.
```

## Evidencia

- Ejecutar forward y rollback/recovery en un entorno desechable con datos representativos.
- Probar mapping, constraints, ausencia, error de DB y limites de paginacion.
- Conservar plan y volumen representativo para queries sensibles; no optimizar por intuicion.
- Registrar comandos, exit codes, integridad y riesgos residuales.

Para PostgreSQL/Drizzle, completar esta baseline con
[Migraciones PostgreSQL y Drizzle](../stacks/backend/nestjs/persistence/references/15-migrations-db.md),
[Data governance](../standards/data/references/13-data-governance.md) y
[Reglas senior de codigo](../stacks/backend/nestjs/quality/references/20-reglas-senior-codigo.md).

