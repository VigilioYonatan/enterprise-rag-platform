# Incident: suspected identity compromise

1. Isolate affected tenant/client at Keycloak and revoke sessions; never log full tokens.
2. Disable compromised broker/provider client IDs, rotate secrets and revoke grants in Google/Meta portals if needed.
3. Audit admin actions, user sessions and document access using retained metadata only.
4. Restore service with new credentials, verify reauthentication, record impact and postmortem.
5. Check whether documents crossed tenant ACL boundaries before declaring incident closed.
