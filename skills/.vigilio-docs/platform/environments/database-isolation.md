# Aislamiento Y Gobernanza De Bases De Datos Por Entorno

Regula el aprovisionamiento, conectividad, migración de esquemas y protección de datos entre entornos locales, no productivos y de producción.

## Matriz De Aislamiento De Datos

| Entorno | Motor / Alojamiento | Aislamiento | Política de Datos |
|---|---|---|---|
| `prod-local` | Contenedor PostgreSQL / Valkey local | Local a la máquina del desarrollador | Semillas sintéticas (`seeds.sql`) sin datos reales. |
| `dev` | Instancia RDS / CloudNativePG compartida | Base de datos o schema independiente por servicio | Datos mock generados por scripts o fixtures de test. |
| `staging` | Clúster RDS / Aurora dedicado | VPC aislada, red privada sin acceso público | Copia sanitizada y anonimizada de producción. |
| `producción` | Clúster Aurora Multi-AZ / RDS Multi-AZ | Cuentas AWS dedicadas con RDS Proxy y KMS | Datos reales cifrados en reposo y tránsito (TLS 1.3). |

## Ciclo Seguro De Migraciones

1. **Migraciones Aditivas:** Todo cambio en el esquema debe ser compatible hacia atrás (añadir columnas opcionales, nuevos índices concurrentes). No se permiten `ALTER TABLE DROP COLUMN` directos.
2. **Despliegues en Dos Fases:**
   - *Fase 1:* Aplicar migración aditiva con Drizzle/Flyway.
   - *Fase 2:* Desplegar nueva versión de código que escribe en las nuevas estructuras.
   - *Fase 3 (Siguiente Release):* Retirar campos antiguos en desuso.
3. **Control de Conexiones:** Producción y Staging deben utilizar poolers de conexiones (RDS Proxy o PgBouncer) para evitar agotamiento de descriptores durante picos de escalado.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Prohibir terminantemente la sincronización directa de volcados de base de datos de producción a entornos de desarrollo o máquinas locales.
- ❌ **Incorrecto:** Conectar el entorno `prod-local` o un branch de staging a la base de datos de producción mediante túneles SSH o accesos VPN directos.
- ✅ **Correcto:** Utilizar herramientas de ofuscación y anonimización irreversible para poblar staging si se requiere un volumen representativo de pruebas.
- ❌ **Incorrecto:** Ejecutar migraciones destructivas que bloqueen tablas completas (`LOCK TABLE`) en producción sin análisis de impacto previo.
