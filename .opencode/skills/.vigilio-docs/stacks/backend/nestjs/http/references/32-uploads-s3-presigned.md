# Uploads S3 con presigned URLs

## Decision

Para subir archivos se usa `POST /uploads/presigned-url`. El backend valida metadata y devuelve una URL temporal de S3 para que el frontend suba el binario directo al bucket.

No se recomienda recibir el archivo en NestJS para luego reenviarlo a S3 salvo casos especiales. Ese proxy consume CPU, memoria, ancho de banda, tiempo de Lambda/EC2 y aumenta el costo.

## Flujo recomendado

1. Frontend envia `file_name`, `mime_type`, `size_bytes` y `purpose`.
2. Backend valida con Zod contra reglas por proposito.
3. Backend genera un `key` sin usar el nombre original para evitar PII y path traversal.
4. Backend firma `PutObject` con expiracion corta.
5. Frontend sube directo a S3 con los headers devueltos.
6. Un proceso posterior puede validar antivirus, dimensiones, checksum o publicar evento.

## Endpoint

```bash
pnpm start:dev # inicia NestJS en modo desarrollo con recarga al cambiar archivos
pnpm smoke:endpoints # prueba health, readiness, OpenAPI, auth, users, products y uploads
```

Request:

```json
{
  "file_name": "factura.pdf",
  "mime_type": "application/pdf",
  "purpose": "document",
  "size_bytes": 2048
}
```

Response:

```json
{
  "success": true,
  "upload": {
    "method": "PUT",
    "bucket": "bus-impl-local-uploads",
    "key": "uploads/document/10/2026/06/uuid.pdf",
    "url": "https://...",
    "headers": {
      "content-type": "application/pdf",
      "cache-control": "private, no-store",
      "x-amz-server-side-encryption": "AES256"
    },
    "expires_in": 900,
    "max_size_bytes": 52428800,
    "purpose": "document",
    "cache_control": "private, no-store"
  }
}
```

## Reglas de seguridad

- El endpoint esta protegido con Bearer token.
- `file_name` no se usa dentro del `key` de S3.
- `mime_type` y `size_bytes` se validan por proposito.
- La URL expira rapido: default `900` segundos, maximo `3600`.
- Se firma `ServerSideEncryption=AES256`.
- El bucket debe ser privado; acceso publico solo via CloudFront firmado si aplica.
- Para produccion, usar IAM minimo necesario: `s3:PutObject` solo sobre el prefijo permitido.

## Costos y cache

- `document` y `evidence` usan `private, no-store` porque suelen contener PII.
- `avatar` usa cache corto: `private, max-age=86400`.
- `product_image` usa `private, max-age=604800, immutable` porque debe ser versionada por key.
- Activar lifecycle policies para mover historicos a S3 Intelligent-Tiering o Glacier cuando aplique.
- Para trafico alto, servir lecturas por CloudFront y no directo desde S3.
- Evitar multipart para archivos pequenos; usar multipart solo cuando el tamano lo justifique.
- Considerar VPC Endpoint para S3 si el backend corre en VPC y hay mucho trafico interno.

## Variables de entorno

```bash
UPLOAD_BUCKET_NAME=bus-impl-local-uploads # bucket destino
UPLOAD_KEY_PREFIX=uploads # prefijo base para ordenar objetos
UPLOAD_PRESIGNED_URL_EXPIRY_SECONDS=900 # expiracion de la URL temporal
```

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
