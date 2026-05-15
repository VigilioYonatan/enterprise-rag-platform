# Referencia AWS y FinOps

Catalogo de servicios AWS, niveles de aprendizaje y reglas de ahorro transversales. El modulo educativo `learn-aws` fue removido del template `bus-impl` (no es codigo de negocio), pero el contenido de referencia se mantiene como documentacion util.

## Servicios AWS referenciados

- `iam`: permisos, roles, OIDC y minimo privilegio.
- `aws-organizations`: multi-account, billing centralizado, SCP y delegated admin.
- `cloudtrail`: auditoria de llamadas API, forensics y compliance.
- `aws-config`: inventario, historial de configuracion y conformance packs.
- `security-hub`: CSPM, findings y controles Foundational Security Best Practices.
- `guardduty`: deteccion administrada de amenazas.
- `budgets-cost-explorer`: budgets, analisis de gasto y recomendaciones FinOps.
- `acm`: certificados TLS administrados.
- `s3`: uploads, backups, artefactos, lifecycle y seguridad de buckets.
- `ebs`: volumenes EC2, snapshots y lifecycle.
- `aws-backup`: backups centralizados, retencion y restore drills.
- `cloudfront`: CDN, cache HTTP, invalidaciones y proteccion de origin.
- `api-gateway`: APIs HTTP/REST/WebSocket, throttling, stages y cache.
- `elastic-load-balancing`: ALB/NLB, health checks y TLS termination.
- `lambda`: APIs/workers serverless, cold starts, memoria y concurrencia.
- `ec2`: compute virtual, Spot, Savings Plans y rightsizing.
- `ecs-fargate`: contenedores administrados, autoscaling y tasks.
- `ecr`: registry de imagenes, scanning y lifecycle policies.
- `rds-aurora`: PostgreSQL administrado, backups, indices y rightsizing.
- `dynamodb`: NoSQL serverless, access patterns, TTL y hot partitions.
- `cache`: ElastiCache/Valkey, TTL, invalidacion y reduccion de carga.
- `cognito`: identidad administrada, user pools, OAuth/OIDC y MFA.
- `ses`: email transaccional, reputacion, SPF/DKIM/DMARC.
- `sqs`: colas, retries, DLQ, batching y backpressure.
- `sns`: pub/sub, fanout, subscription filters y eventos versionados.
- `eventbridge`: bus de eventos, reglas, scheduling y schemas.
- `step-functions`: workflows, retries, procesos largos y saga.
- `kinesis`: streaming en tiempo real y consumidores multiples.
- `firehose`: ingestion administrada hacia S3/OpenSearch/Redshift.
- `glue`: ETL, Data Catalog, crawlers y conversion a Parquet.
- `athena`: SQL serverless sobre S3.
- `opensearch`: busqueda, logs analytics y dashboards.
- `cloudwatch`: logs, metricas, alarmas, dashboards y retencion costo-eficiente.
- `secrets-manager`: secretos, rotacion, auditoria y permisos.
- `parameter-store`: parametros por ambiente, SecureString y config simple.
- `kms`: llaves de cifrado, key policies y auditoria.
- `vpc`: red, subnets, endpoints, NAT y costos de egress.
- `waf`: proteccion de APIs/edge, rate limits y managed rules.
- `route53`: DNS, health checks y routing policies.
- `bedrock`: IA generativa, modelos, agentes, tokens y guardrails.

Categorias validas para `category`:

- `ai`, `api`, `analytics`, `backup`, `cache`, `compute`, `containers`, `database`, `dns`, `edge`, `email`, `eventing`, `governance`, `identity`, `load-balancing`, `messaging`, `networking`, `observability`, `orchestration`, `security`, `storage`.

## Niveles

- `basic`: entender para que sirve el servicio, cuando no usarlo y su costo principal.
- `intermediate`: operar con CDK, IAM, alarmas y separacion por ambiente.
- `advanced`: resiliencia, cuotas, rollback, SLOs y pruebas de fallo.
- `senior`: golden paths, guardrails, FinOps, multi-account y evidencia de compliance.

## Reglas de ahorro que se repiten

- Tags obligatorios por `app`, `stage`, `owner` y `cost-center`.
- Budgets y alarmas por cuenta/stage.
- Retencion corta en logs de lower environments.
- TTL/lifecycle para datos temporales.
- Previews y recursos efimeros con destruccion automatica.
- Rightsizing continuo de DB, cache y Lambda.
- No usar servicios administrados caros si el volumen real no lo justifica.
- Usar throttling, queues y WAF para limitar abuso antes de escalar compute.
- Revisar Cost Optimization Hub/Compute Optimizer y eliminar recursos sin owner.

## Referencias base

- AWS Products: https://aws.amazon.com/products/
- AWS Well-Architected Cost Optimization: https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html
- Lambda best practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- API Gateway throttling/caching: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html
- CloudWatch recommended alarms: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html

_(El modulo `learn-aws` fue removido de `bus-impl/src/` por ser codigo educativo que no pertenece al template de proyecto.)_

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Referencia AWS y FinOps

✅ **Correcto:** Para **Referencia AWS y FinOps**, limitar roles cloud, medir el coste y utilizar enlaces a las guías AWS propietarias.

❌ **Incorrecto:** En **Referencia AWS y FinOps**, copiar credenciales AWS, inventar precios o meter la configuración cloud dentro del modelo de negocio.
