# 09 — Plan de Implementación Vertical

Cada funcionalidad se implementa verticalmente a través de todas las capas:
1. Esquema SQL y políticas RLS.
2. Contratos DTO en Zod y tipos TypeScript inferidos.
3. Repositorios de datos y servicios de dominio.
4. Controladores HTTP documentados en OpenAPI con respuestas paginadas.
5. Sincronización de esquemas hacia el frontend.
6. Componentes de UI accesibles con manejo de estados de carga, error y confirmación.
7. Pruebas unitarias, de contratos y escenarios BDD.
