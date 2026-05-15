# Optimizacion de Costos y Recursos AWS - `bus-impl` 2026

Este documento junta buenas practicas para ahorrar recursos de servidor, dinero en AWS y carga operativa sin romper seguridad ni calidad.

Fue alineado el `2026-06-08` con documentacion oficial de AWS.

Regla madre:

- primero medir
- luego optimizar
- nunca ahorrar rompiendo seguridad, trazabilidad o resiliencia

---

## 1. Principios de costo sanos

La referencia principal para este tema debe ser el **Cost Optimization Pillar** del Well-Architected Framework.

Ideas clave:

- ownership claro del costo
- presupuestos y alertas desde el inicio
- revision periodica del workload
- automatizacion para apagar, expirar, transicionar o bloquear gasto innecesario
- usar el servicio correcto antes de pensar en micro-optimizaciones

Regla:

- si el equipo no tiene tags, budgets, alarms ni reportes por servicio, todavia no esta haciendo optimizacion de costo de verdad

---

## 2. Reglas fuertes para este backend

Para este `bus-impl` la recomendacion brutalmente honesta es:

- **Node 24**
- **Lambda `nodejs24.x`**
- **arm64** por defecto cuando las dependencias lo soporten
- **API Gateway HTTP API** si no necesitas las features exclusivas de REST API
- **Aurora Serverless v2** solo si la carga es variable o impredecible
- **S3 Lifecycle + Intelligent-Tiering + Storage Lens**
- **CloudWatch Logs con retencion finita**
- **gateway endpoints para S3 y DynamoDB** cuando el trafico sale desde subnets privadas

Lo que mas suele quemar plata sin darse cuenta:

- NAT gateways mal pensados
- logs sin retencion
- S3 sin lifecycle
- ECR sin limpieza
- Lambdas sobredimensionadas
- Aurora sobreaprovisionado para ambientes de bajo uso
- usar REST API cuando HTTP API bastaba

---

## 3. Lambda: ahorrar tiempo de ejecucion y dinero

### 3.1 Runtime y arquitectura

Buenas practicas:

- usar `nodejs24.x`
- probar `arm64` como baseline
- medir x86_64 solo si alguna dependencia binaria lo exige

AWS documenta que Lambda con `arm64` puede lograr **significantly better price and performance** que la equivalente en `x86_64`.

Recomendacion:

- en CDK, dejar `lambda.Architecture.ARM_64` por defecto
- hacer canary si migras una Lambda sensible desde `x86_64`

### 3.2 Reuso de ejecucion

AWS recomienda:

- inicializar SDK clients fuera del handler
- inicializar conexiones de DB fuera del handler
- cachear assets estaticos pequenos en `/tmp`

Esto reduce duracion y por tanto costo.

### 3.3 Memory tuning

No fijar memoria por intuicion.

Reglas:

- probar varias memorias con carga real
- mirar duracion, memoria usada y costo total
- bajar memoria solo si no aumenta demasiado la duracion
- subir memoria si reduce mucho el tiempo total

Heuristica sana:

- IO-heavy: no asumir que menos memoria siempre es mas barato
- CPU-heavy: subir memoria a veces reduce costo porque termina mucho antes

### 3.4 Concurrency

Buenas practicas:

- no poner `reserved concurrency` por costumbre
- usarla para proteger DB, terceros o colas
- si no hay necesidad de freno, dejar que Lambda escale naturalmente

### 3.5 Batching

Para SQS, Lambda permite procesar varios mensajes por invocacion.

Reglas:

- si el trabajo por item es corto, subir `batch size`
- si el batch es mayor a 10 en colas standard, configurar `MaximumBatchingWindowInSeconds`
- ajustar `visibility timeout` para el tiempo real de proceso

Esto reduce invocaciones y costo por overhead.

### 3.6 Empaquetado

Buenas practicas:

- reducir dependencias
- no subir SDKs o binarios innecesarios
- si usas imagenes en ECR, limpiar tags viejos

Regla:

- cada MB extra no solo pesa al desplegar; tambien puede empeorar cold starts y tiempos de build

---

## 4. API Gateway y borde

### 4.1 HTTP API vs REST API

AWS documenta que **HTTP APIs** fueron disenadas con menos features para poder ofrecerse a **lower price** que **REST APIs**.

Recomendacion:

- usar **HTTP API** por defecto
- subir a **REST API** solo si realmente necesitas cosas como:
  - API keys
  - per-client throttling
  - request validation nativa
  - integracion con AWS WAF
  - private API endpoints

Regla:

- si eliges REST API, debe haber una razon concreta escrita en la ADR o en el README del modulo

### 4.2 CloudFront

Para docs estaticas, assets o respuestas muy repetidas:

- poner CloudFront delante
- mejorar cache hit ratio
- forwardear solo query params, cookies y headers estrictamente necesarios

AWS documenta que mejor cache hit ratio reduce carga sobre el origin y costo operativo.

Usar **Origin Shield** solo si el origin realmente sufre carga o si ya mediste que ayuda; no activarlo por moda.

---

## 5. S3: donde mas dinero se fuga en silencio

### 5.1 Storage class correcta

AWS recomienda elegir la storage class segun patron de acceso.

Baseline:

- `S3 Standard` para acceso frecuente
- `S3 Intelligent-Tiering` para acceso desconocido o cambiante
- `Standard-IA` / `One Zone-IA` para acceso menos frecuente y bien entendido
- clases Glacier para archivo real

Regla:

- si no conoces el patron de acceso, `Intelligent-Tiering` suele ser mas sano que adivinar

### 5.2 Lifecycle rules

Toda bucket de aplicacion debe revisarse con estas preguntas:

- expira versiones antiguas no actuales
- transiciona objetos frios
- elimina delete markers expirados cuando aplique
- aborta multipart uploads incompletos

AWS recomienda usar `AbortIncompleteMultipartUpload` porque los parts subidos pero no completados **siguen costando dinero**.

### 5.3 Storage Lens

Activar **S3 Storage Lens** para:

- encontrar buckets grandes
- detectar buckets frios
- detectar multipart uploads incompletos
- revisar buckets sin lifecycle rules
- revisar acumulacion de versiones no actuales

Regla:

- si no usas Storage Lens o analitica similar, normalmente estas gestionando S3 a ciegas

### 5.4 Transfer y performance

Buenas practicas:

- mantener compute y S3 en la misma Region cuando sea posible
- reutilizar conexiones HTTP hacia S3
- usar CloudFront cuando el mismo contenido se sirve muchas veces

---

## 6. Base de datos: Aurora, RDS y conexiones

### 6.1 Cuando Aurora Serverless v2 tiene sentido

AWS documenta que Aurora Serverless v2 ayuda especialmente en:

- cargas variables
- picos impredecibles
- ambientes de desarrollo y testing
- workloads donde quieres evitar sobreaprovisionamiento

Recomendacion:

- usar Aurora Serverless v2 en `development`, `staging` o cargas realmente variables
- para cargas muy estables y predecibles, comparar contra provisionado antes de decidir

Esto ultimo es una inferencia razonable de la documentacion: Serverless v2 brilla donde la carga cambia mucho; no siempre es la opcion mas barata para carga plana y constante.

### 6.2 RDS Proxy

Si Lambda abre demasiadas conexiones:

- evaluar **RDS Proxy**
- usarlo cuando el cuello sea pooling y fan-out de conexiones

Regla:

- no meter RDS Proxy por defecto en todos los ambientes
- justificarlo con metrica real de conexiones, errores o saturacion

### 6.3 Observabilidad de DB

Buenas practicas:

- monitorear CPU, memoria, almacenamiento y capacidad
- alarmar antes de llegar a limites
- revisar TTL DNS bajos en clientes si dependes de failover

---

## 7. Red y salida a internet

### 7.1 NAT Gateway

AWS documenta que un NAT Gateway cobra por:

- hora activa
- gigabytes procesados

Por eso:

- no poner NAT por inercia
- revisar trafico por NAT regularmente
- evitar cross-AZ innecesario hacia NAT

### 7.2 Gateway endpoints

AWS documenta que los **gateway endpoints** para **S3** y **DynamoDB**:

- no requieren internet gateway ni NAT device
- no tienen cargo adicional

Recomendacion fuerte:

- si tus Lambdas privadas hablan mucho con S3 o DynamoDB, usar gateway endpoints

### 7.3 Interface endpoints

Si la mayoria del trafico NAT es a servicios AWS compatibles:

- evaluar interface endpoints o gateway endpoints segun servicio

Regla:

- no crear endpoints privados para todo
- comparar costo del endpoint contra el trafico NAT real

---

## 8. Logs, metricas y observabilidad

### 8.1 CloudWatch Logs

No dejar logs en `Never Expire` por costumbre.

AWS permite configurar retencion por log group y documenta que los eventos marcados para borrado dejan de contar para costo de almacenamiento, aunque la eliminacion fisica puede tardar hasta 72 horas.

Recomendacion de baseline:

| Ambiente | Retencion sugerida |
|---|---|
| `development` | `14d` |
| `staging` | `90d` |
| `production` app logs | `180d` |
| auditoria o compliance | segun politica regulatoria |

Estos valores coinciden con `cdk/lib/config/stage-config.ts`. Las suites con `NODE_ENV=test` no
crean un stage AWS permanente.

### 8.2 Loggear menos, medir mejor

Buenas practicas:

- no loggear payloads completos por defecto
- no loggear PII
- no duplicar el mismo error en varias capas
- usar metricas y alarms para salud operativa
- usar sampling en logs debug si el volumen explota

Regla:

- muchas veces el costo de observabilidad se dispara por mala higiene de logs, no por volumen de negocio

### 8.3 Export y cifrado

Si necesitas retencion larga:

- evaluar export a S3
- mantener CloudWatch para consulta operativa corta
- usar KMS si el contexto de seguridad lo requiere

---

## 9. Eventos y mensajeria

### 9.1 SQS

AWS recomienda usar batch actions para enviar, recibir y borrar varios mensajes en una sola llamada.

Buenas practicas:

- usar `SendMessageBatch` y operaciones batch cuando aplica
- calibrar batch size en Lambda consumers
- no usar un mensaje por invocacion si el trabajo admite agrupacion

### 9.2 EventBridge

AWS documenta que `PutEvents` permite batch y que puedes enviar hasta 10 eventos por request para eficiencia.

Buenas practicas:

- agrupar eventos cuando el productor los genera juntos
- revisar cuotas por Region antes de crecer sin control
- no generar eventos redundantes si un solo evento de dominio sirve

---

## 10. ECR y artefactos de build

Si usas Lambdas en contenedor o pipelines con imagenes:

- crear lifecycle policies en ECR
- expirar imagenes viejas o sin uso
- archivar o borrar tags no productivos
- revisar el preview antes de aplicar la policy

AWS documenta que ECR puede expirar o archivar imagenes automaticamente con lifecycle policies.

Regla:

- no guardar para siempre cada build de feature branch

---

## 11. Tags, budgets y DevSecOps de costo

La optimizacion real no es solo tecnica. Tambien es gobierno.

### 11.1 Tags obligatorios

Todo recurso de este workload deberia llevar al menos:

- `app`
- `service`
- `bounded_context`
- `stage`
- `owner`
- `cost_center`
- `data_classification`

Sin tags:

- no hay showback
- no hay alertas utiles
- no hay ownership real del gasto

### 11.2 AWS Budgets

Crear budgets para:

- cuenta `development`
- cuenta `staging`
- cuenta `production`
- gasto de runners y servicios efimeros de CI por separado
- servicios caros como `Lambda`, `RDS`, `NAT Gateway`, `CloudWatch`, `S3`

### 11.3 Budget Actions

AWS Budgets puede ejecutar acciones cuando se supera un umbral.

Recomendacion:

- en `development`, considerar acciones automaticas o con aprobacion para frenar gasto
- en `production`, usar mas alertas y aprobaciones que acciones destructivas

Ejemplos sanos:

- bloquear provision de ciertos recursos al 90% del presupuesto
- requerir aprobacion para nuevos recursos de alto costo

### 11.4 Cost Anomaly Detection

Activar **AWS Cost Anomaly Detection**.

Sirve para:

- detectar gasto anomalo
- alertar por email o SNS
- reaccionar antes de cerrar el mes

### 11.5 Compute Optimizer

Activar **AWS Compute Optimizer** donde aplique.

Sirve para:

- rightsizing
- identificar recursos infrautilizados
- comparar mejor trade-off precio/rendimiento

### 11.6 CI/CD y CDK

Buenas practicas:

- `cdk diff` obligatorio en PR
- revisar cambios de costo sensible en recursos always-on
- no permitir recursos manuales fuera de IaC
- si el PR crea NAT Gateway, Aurora, OpenSearch, WAF avanzado o endpoints privados, pedir review adicional

Regla:

- costo y seguridad deben revisarse juntos; un cambio caro casi siempre tambien afecta operacion o riesgo

---

## 12. Checklist por ambiente

### Development

- budgets bajos
- budget actions mas agresivas
- Aurora Serverless v2 o recursos pequenos
- retencion corta de logs
- buckets con lifecycle estricto
- previews con TTL

### Test

- datasets sinteticos
- autoapagado o limpieza de stacks efimeros
- DB variable segun carga
- ECR limpio

### Staging

- parecido a prod, pero sin exceso
- logs con retencion media
- revisar que el costo no se acerque demasiado a prod sin razon

### Production

- optimizar sin perder resiliencia
- budgets y anomaly detection fuertes
- tags y ownership obligatorios
- revisar regularmente HTTP API vs REST, arm64, cache hit ratio, S3 lifecycle y log retention

---

## 13. Defaults que yo pondria en este repo

Si tuviera que decidir hoy para este backend:

- `Node 24`
- `Lambda nodejs24.x`
- `arm64` por defecto
- `HTTP API` por defecto
- `CloudFront` para docs o assets repetidos
- `Valkey/ElastiCache` solo cuando la lectura realmente lo justifique
- `Aurora Serverless v2` en ambientes variables
- `S3 Intelligent-Tiering` para acceso incierto
- `AbortIncompleteMultipartUpload` en buckets de subida
- `CloudWatch Logs` con retencion explicita
- `gateway endpoints` para S3 y DynamoDB si hay trafico desde subnets privadas
- `ECR lifecycle policies` si se usan imagenes
- `Budgets + Budget Actions + Cost Anomaly Detection + Compute Optimizer`

---

## 14. Fuentes oficiales recomendadas

- AWS Well-Architected Cost Optimization: [framework](https://docs.aws.amazon.com/wellarchitected/2024-06-27/framework/cost-optimization.html), [pillar](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html)
- AWS Lambda: [best practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html), [arm64 architecture](https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html)
- API Gateway: [HTTP APIs vs REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- S3: [cost optimization](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cost-optimization.html), [Intelligent-Tiering](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-intelligent-tiering.html), [Storage Lens](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-lens-optimize-storage.html), [Lifecycle rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html), [abort multipart uploads](https://docs.aws.amazon.com/AmazonS3/latest/userguide/abort-mpu.html)
- Aurora: [Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html), [how it works](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html), [best practices](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.BestPractices.html)
- Cost controls: [Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html), [AWS Budgets actions](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-action-configure.html), [Compute Optimizer](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
- Red: [NAT gateway pricing guidance](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html), [gateway endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html), [S3 gateway endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)
- CloudWatch Logs: [log groups and retention](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html), [PutRetentionPolicy](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutRetentionPolicy.html)
- CloudFront: [cache hit ratio](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-hit-ratio.html), [Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html)
- SQS y EventBridge: [SQS batch actions](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-batch-api-actions.html), [Lambda with SQS](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html), [EventBridge PutEvents](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-putevents.html)
- ECR: [lifecycle policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html)

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Separar estrategia por runtime (EKS vs Lambda) y validar manifests/IaC, acceso mínimo, health checks, rollback.
- ❌ **Incorrecto:** Confundir workflows de Lambda con EKS o tratar muestras YAML como un despliegue verificado.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
