const fs = require('node:fs');
const path = require('node:path');

const localCopy = path.join(__dirname, '..', 'src', 'generated', 'openapi.json');
const siblingSpec = process.env.OPENAPI_SOURCE_PATH
  ? path.resolve(process.env.OPENAPI_SOURCE_PATH)
  : path.join(__dirname, '..', '..', 'enterprise-rag-impl', 'openapi.json');

fs.mkdirSync(path.dirname(localCopy), { recursive: true });
if (fs.existsSync(siblingSpec)) {
  fs.copyFileSync(siblingSpec, localCopy);
  console.log('Synced OpenAPI contract from', siblingSpec);
} else if (!fs.existsSync(localCopy)) {
  console.error('No OpenAPI specification found at', siblingSpec, 'or', localCopy);
  process.exit(1);
}
