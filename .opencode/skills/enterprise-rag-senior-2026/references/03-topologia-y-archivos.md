# 03 — Topología de Repositorios y Archivos

El sistema está estructurado en 5 repositorios lógicos independientes:
1. `apps/enterprise-rag-impl`: Aplicación backend NestJS modular.
2. `apps/enterprise-rag-web`: Interfaz de usuario React + Vite.
3. `enterprise-rag-deploy`: Manifiestos de despliegue Compose, configuración de Caddy, Keycloak y observabilidad.
4. `platform-ops`: Infraestructura operativa, roles Ansible y scripts de respaldo.
5. `prod-local`: Entorno de validación local, suites BDD y pruebas de invariants.

Cada repositorio mantiene sus propios scripts de compilación, linters y dependencias. No existe acoplamiento en raíz.
