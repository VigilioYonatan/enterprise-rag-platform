# Fundación De Kubernetes On-Premise Y Edge

Define la arquitectura, componentes de red CNI, almacenamiento distribuido y gobernanza para clústeres Kubernetes desplegados en centros de datos locales (On-Premise) y entornos Edge.

## Arquitectura Base On-Premise

Para entornos corporativos donde no se cuenta con servicios gestionados como AWS EKS, la arquitectura de plataforma implementa componentes estandarizados y auditados:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes On-Premise                    │
├──────────────────────────────┬──────────────────────────────┤
│ Control Plane (etcd + API)   │ Distribución: K3s / RKE2      │
├──────────────────────────────┼──────────────────────────────┤
│ Red y CNI                    │ Cilium con eBPF (sin kube-pr)│
├──────────────────────────────┼──────────────────────────────┤
│ Balanceo de Carga L4/L7      │ MetalLB (BGP/L2) + Ingress   │
├──────────────────────────────┼──────────────────────────────┤
│ Almacenamiento CSI           │ Longhorn / Rook-Ceph         │
├──────────────────────────────┼──────────────────────────────┤
│ Gestión de Certificados      │ cert-manager con CA interna  │
├──────────────────────────────┼──────────────────────────────┤
│ Seguridad en Runtime         │ Tetragon (eBPF) + Kyverno    │
└──────────────────────────────┴──────────────────────────────┘
```

## Componentes Esenciales De Infraestructura

1. **CNI Basado en eBPF con Cilium:** Reemplazo integral de `kube-proxy` (`kubeProxyReplacement: true`) mediante eBPF para balanceo de alto rendimiento, cifrado transparente WireGuard entre nodos y aplicación estricta de NetworkPolicies L3/L4/L7.
2. **Exposición L4 con MetalLB:** Provisión de direcciones IP virtuales (VIPs) en subredes locales para servicios tipo `LoadBalancer`, operando en modo BGP con los switches core del datacenter o en modo Layer 2.
3. **Almacenamiento Persistente Confiable:** Uso de drivers CSI como Longhorn o Rook-Ceph para replicación sincrónica de bloques en al menos 3 nodos físicos distintos (`replicaCount: 3`), garantizando alta disponibilidad ante caídas de hardware.
4. **Gobierno de Certificados con cert-manager:** Emisión y renovación automática de certificados TLS internos mediante HashiCorp Vault o la CA institucional corporativa.

## Prerrequisitos De Ejecución

1. Nodos Linux físicos o virtualizados con versión de kernel `>= 5.10` para compatibilidad completa con eBPF de Cilium.
2. Rango de direcciones IP estáticas dedicado en la red corporativa para el pool de MetalLB (`IPAddressPool`).
3. Discos NVMe/SSD dedicados y particionados exclusivamente para almacenamiento de Longhorn o Rook-Ceph.
4. Configuración previa de peers BGP en los routers de datacenter (o soporte de ARP/NDP si se opera en modo L2).

## Matriz De Decisiones On-Premise

| Criterio | MetalLB Modo BGP | MetalLB Modo L2 | Longhorn CSI | Rook-Ceph |
|---|---|---|---|---|
| Requisito de Red | Soporte BGP en top-of-rack switches | Red local plana con ARP | Discos locales formateados | Clúster Ceph dedicado |
| Alta Disponibilidad | ECMP multi-nodo instantáneo | Failover por elección de nodo líder | Replicación x3 entre nodos | Replicación y distribución Ceph |
| Caso de Uso Principal | Producción Datacenter Core | Edge, laboratorios y ramas | Cargas de propósito general | Cargas a escala masiva petabyte |
| Complejidad Operativa | Media (coordinación con red) | Baja (plug-and-play) | Baja/Media | Alta |

## Procedimiento De Despliegue Y Endurecimiento

1. **Instalación del Control Plane (K3s/RKE2):**
   - Despliegue con banderas `--flannel-backend=none` y `--disable-kube-proxy` para ceder el control completo a Cilium.
   - Activación de etcd distribuido en topología impar (mínimo 3 nodos master).
2. **Despliegue del CNI Cilium:**
   - Instalación mediante Helm con `tunnelProtocol: vxlan` (o modo enrutado nativo) y `kubeProxyReplacement: true`.
   - Habilitación de Hubble para observabilidad profunda de flujos L4/L7.
3. **Configuración de MetalLB y Storage:**
   - Aplicación de manifiestos `IPAddressPool` y `L2Advertisement` (o `BGPPeer` / `BGPAdvertisement`).
   - Despliegue del Helm chart de Longhorn configurando StorageClass por defecto con política de retención y 3 réplicas sincronizadas.

## Pruebas Negativas Y Detección De Fallos

- **Simulación de Caída de Nodo de Almacenamiento:** Drenado o apagado abrupto de un nodo de datos; el pod consumidor debe mantenerse operativo leyendo de las dos réplicas restantes sin degradación de I/O.
- **Validación de Denegación de Red (Zero Trust):** Verificación de que namespaces sin NetworkPolicy o con política `default-deny` bloquean cualquier conexión entrante o saliente no declarada.
- **Fallo de Enrutamiento MetalLB:** Simulación de fallo en el nodo titular de una IP virtual; MetalLB L2 debe reanunciar el ARP gratito en menos de 3 segundos hacia el nuevo nodo asignado.

## Procedimiento De Rollback Y Recuperación

1. **Recuperación de Volúmenes Longhorn:** Si una partición se corrompe, restaurar la instantánea periódica desde el backend de respaldo remoto (S3 on-premise / MinIO) mediante el CRD `Longhorn RecurringJob`.
2. **Rollback de Versión de CNI Cilium:** Ejecutar `helm rollback cilium` preservando las conexiones existentes mediante el estado residente en eBPF maps sin reiniciar el kernel del nodo.
3. **Restauración del Control Plane:** Si etcd pierde quórum, ejecutar snapshot restore desde `/var/lib/rancher/rke2/server/db/snapshots/` siguiendo el runbook de recuperación de desastres.

## Evidencia Requerida Para Gates

- Ejecución exitosa de `cilium connectivity test` con 100% de tests aprobados.
- Manifiestos de StorageClass verificando `replicaCount >= 3`.
- Salida del comando `kubectl get nodes -o wide` verificando todos los nodos en estado `Ready` con la versión fijada de Kubernetes.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Emplear Cilium con modo eBPF nativo para obtener visibilidad profunda de tráfico y aislamiento granular entre namespaces.
- ❌ **Incorrecto:** Utilizar configuraciones por defecto de `kube-proxy` con tablas iptables gigantescas que degradan el rendimiento bajo alta concurrencia.
- ✅ **Correcto:** Replicar volúmenes persistentes en al menos 3 nodos físicos distintos para soportar fallos de hipervisor sin pérdida de datos.
- ❌ **Incorrecto:** Confiar en `hostPath` o volúmenes locales no replicados para bases de datos transaccionales en producción on-premise.
