# NestJS: autenticación, autorización y protección del tenant

Privado por defecto. `@ApiBearerAuth` solo documenta; guards, policies y filtros SQL son el control efectivo. Defender también websocket y workers, que pueden carecer de request HTTP. No fiarse del tenant enviado en `query`.

## Cadena

1. Autenticar JWT/sesión con audiencia, issuer, tiempos y rotación adecuados.
2. Resolver permisos de aplicación y propietario/tenant.
3. Exigir permisos en handler y query a nivel repositorio; impedir fugas de caché.
4. Sanitizar errores y aplicar rate limiting a endpoints públicos/privados críticos.
5. Revisar secretos, tokens y trazas; no registrar Authorization header ni DTO completo.

✅ Correcto: test 401 sin JWT, 403 sin permiso, denegar lectura del producto de otro tenant e invalidar cache tras revocación de rol.

❌ Incorrecto: `@Public()` en listados sensibles, `@ApiBearerAuth()` sin guard, `repository.findById(id)` que ignore tenant.

Separar deployment: auth común no exige AWS; [EKS](../../../../platform/kubernetes/deployment-security.md) y [Lambda](../../../../platform/aws/lambda-operations.md) son perfiles opcionales.

[Autorización](../../../../standards/security/authorization.md), [tenancy](../../../../standards/security/tenant-isolation.md).

## Procedencia documental preservada

- [Capítulo heredado: 12-authz-security.md](references/12-authz-security.md) — contenido íntegro conservado.
- [Capítulo heredado: 23-seguridad-hardening.md](references/23-seguridad-hardening.md) — contenido íntegro conservado.

## Controller seguro: HTTP y caso de uso separados

```typescript
@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProductsReadGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly app: ProductApplicationService) {}

  @Get()
  @ApiOperation({ operationId: 'listProducts' })
  @ApiOkResponse({ type: ListProductsResponseDocDto })
  listProducts(
    @Query(new ZodQueryPipe(listProductsQueryDto)) query: ListProductsQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<ListProductsResponseDto> {
    return this.app.listProducts(query, principal);
  }
}
```

Fragmento de integración: `JwtAuthGuard`, `ProductsReadGuard`, `CurrentPrincipal` y `AuthenticatedPrincipal` son componentes definidos por la aplicación. `@ApiBearerAuth()` documenta, pero **no protege** el endpoint por sí mismo; la Policy/repositorio debe filtrar por tenant y permisos de cada recurso.

### Matriz de autorización mínima

- Sin token: `401`; token válido sin permiso: `403`; recurso de otro tenant: respuesta que no filtre existencia según política de privacidad.
- Workers/cron: identidad de servicio y permisos explícitos, no confiar en `tenant_id` dentro del mensaje.
- `@Public()` exclusivamente cuando una revisión de datos/producto lo apruebe y un test demuestre que la respuesta es pública.
- Claves de caché separadas por tenant/scope; no cachear errores `401/403` como si fuesen resultados del dominio.
- Rate limit y audit trail para cambios críticos; redactar trazas y logs de seguridad.

✅ Correcto: autorización de objeto en todos los adaptadores, no solamente middleware HTTP.

❌ Incorrecto: exponer productos privados por `@Public()` o confiar en `@ApiBearerAuth()` como guard.
