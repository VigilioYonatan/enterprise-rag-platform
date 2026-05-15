# Pruebas Automatizadas De Infraestructura Como Código

Establece la pirámide de pruebas y las herramientas de validación requeridas para módulos y stacks de Terraform antes de su aplicación en la nube.

## Pirámide De Pruebas De Infraestructura

```text
       ▲
      / \
     /   \     Pruebas de Integración (Terratest / terraform test en sandbox efímero)
    /-----\
   /       \   Estimación de Costos y Políticas (Infracost + OPA/Conftest)
  /---------\
 /           \ Análisis Estático y Seguridad (terraform validate + tflint + Checkov)
/─────────────\
```

1. **Nivel 1 - Análisis Estático y Seguridad:**
   - `terraform fmt -check`: Cumplimiento estricto del formato canónico de HCL.
   - `tflint`: Detección de errores específicos del proveedor AWS/Azure y desuso de sintaxis.
   - `checkov` / `trivy config`: Verificación de que no existan Security Groups abiertos (`0.0.0.0/0`), buckets públicos o recursos sin cifrar.
2. **Nivel 2 - Cumplimiento y Presupuesto:**
   - Reglas OPA (`policies/`): Obligatoriedad de tags estándar (`Owner`, `Environment`, `Project`, `CostCenter`).
   - `infracost`: Bloqueo de Pull Requests que incrementen el presupuesto mensual de la cuenta más allá del umbral establecido.
3. **Nivel 3 - Pruebas De Integración (`terraform test`):**
   - Ejecución de bloques de prueba declarativos nativos (`.tftest.hcl`) en cuentas sandbox temporales con destrucción garantizada (`terraform destroy`).

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Ejecutar `terraform validate`, `tflint` y `checkov` como gates bloqueantes en todos los Pull Requests de infraestructura.
- ❌ **Incorrecto:** Subir cambios de Terraform directamente a producción confiando en que "la sintaxis se ve bien" sin validación de políticas.
- ✅ **Correcto:** Probar módulos de Terraform en sandboxes aislados con ciclo de vida corto y destrucción automática asegurada.
- ❌ **Incorrecto:** Probar nuevas versiones de módulos directamente sobre el entorno de desarrollo compartido o staging.
