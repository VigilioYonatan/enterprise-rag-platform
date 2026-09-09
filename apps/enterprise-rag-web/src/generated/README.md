# Generated HTTP contracts

Do not write types by hand here. In `apps/enterprise-rag-impl`, run `npm run build && npm run openapi:export` (creates `openapi.json`); then run `npm run contracts:generate` from web. A CI consumer must compare the generated output against the committed version. This artifact cannot be generated until dependencies can be installed; no fake client is committed.
