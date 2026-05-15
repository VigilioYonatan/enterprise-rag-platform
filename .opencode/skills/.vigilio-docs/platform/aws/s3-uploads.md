# Uploads S3 con URLs presigned (transversal)

Frontend solicita una autorización corta para subir un objeto. Backend valida identidad/tenant, extensión/tamaño/MIME real, genera clave impredecible y URL de corta expiración. El upload ocurre directo a S3, seguido de confirmación/verificación del objeto y escaneo según clasificación de riesgo.

✅ Correcto: tamaño restringido, policy condicionada, bucket privado, expiración corta, checksum, post-upload validation y lifecycle cleanup.

❌ Incorrecto: URL presigned sin límite, key basada en nombre de usuario o asumir que Content-Type declarado equivale a archivo seguro.

Probar revocación/autorización, sustitución cross-tenant, contenido inesperado, URLs caducadas y logs privados. [Seguridad común](../../standards/security/tenant-isolation.md).

## Procedencia documental preservada

- [Capítulo heredado: 32-uploads-s3-presigned.md](../../stacks/backend/nestjs/http/references/32-uploads-s3-presigned.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


## Subida segura de objetos — recorrido completo

Los siguientes controles son escenarios de diseño y revisión específicos de este documento. Usar pruebas reales y evidencias del consumidor; aquí **no** se afirma haber desplegado infraestructura.

1. **Control 1:** Comprobar identidad y permiso **antes** de emitir URL firmada; derivar tenant/carpeta desde servidor.
2. **Control 2:** Limitar expiración, método HTTP, content type, tamaño esperado y destino del objeto.
3. **Control 3:** Crear object key aleatoria y no aceptar una ruta arbitraria del cliente.
4. **Control 4:** Bloquear acceso público y probar bucket policy con principal sin permiso.
5. **Control 5:** Cifrar almacenamiento, rotar claves bajo política y validar quién puede descifrar.
6. **Control 6:** Examinar MIME real y aplicar análisis antimalware antes de servir el objeto si el riesgo lo exige.
7. **Control 7:** Guardar metadata mínima y checksum; fallar con error estable ante mismatch.
8. **Control 8:** Gestionar cargas multipart incompletas y expirarlas sin costes innecesarios.
9. **Control 9:** Autorizar descargas igual que subidas; no suponer que conocer la key implica acceso.
10. **Control 10:** Probar upload válido, vencido, cross-tenant, tamaño mayor, contenido inválido, replay y fallo del scanner.
11. **Control 11:** Medir coste storage, requests y egress; definir retención y borrado verificable.

✅ **Correcto:** ejecutar cada control pertinente, registrar owner, evidencia y decisión de aceptación.

❌ **Incorrecto:** confundir un checklist con un despliegue probado o borrar restricciones anteriores por resumir.
