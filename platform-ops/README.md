# Platform Ops — cloud neutral

This repo will own VPS hardening, host firewall, Podman/Docker rootless decisions, users/SSH policy, external encrypted 3-2-1 backups, monitoring agents and restore runbooks. No AWS, no Terraform mandatory, no Kubernetes.

## Prod blocker checklist

- [ ] Version/digest-pin images and verify signatures pre-pull.
- [ ] Move secrets from interpolated URLs to secret files/secret manager.
- [ ] Separate PostgreSQL migration role from runtime and restrict schema ownership.
- [ ] Enable TLS via Caddy FQDN and Keycloak proxy headers.
- [ ] Audit CSP/CSRF/XSS and rotate client credentials.
- [ ] Configure pgBackRest continuous WAL archive to independent host/storage.
- [ ] Perform offsite restore + RTO/RPO measurements.
- [ ] Configure alerting and dashboards.
- [ ] Run vulnerability scans and SBOM attestations.
