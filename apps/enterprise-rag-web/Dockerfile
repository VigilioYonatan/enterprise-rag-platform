FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.14.0 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
ARG VITE_API_BASE=/api/v1
ARG VITE_OIDC_AUTHORITY=http://localhost:8081/realms/enterprise
ARG VITE_OIDC_CLIENT_ID=enterprise-rag-web
ARG VITE_GOOGLE_ENABLED=false
ARG VITE_FACEBOOK_ENABLED=false
RUN pnpm run build

FROM caddy:2-alpine
RUN mkdir -p /data /config /srv && chown -R 65532:65532 /data /config /srv /etc/caddy
COPY --from=build --chown=65532:65532 /app/dist /srv
COPY --chown=65532:65532 Caddyfile /etc/caddy/Caddyfile
USER 65532:65532
EXPOSE 8080
