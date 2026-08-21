FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.14.0 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm run build && pnpm prune --prod --ignore-scripts

FROM gcr.io/distroless/nodejs24-debian13:nonroot
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=65532:65532 /app/package.json ./package.json
COPY --from=build --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=build --chown=65532:65532 /app/dist ./dist
USER 65532:65532
EXPOSE 3000
CMD ["--require", "./dist/observability/tracing.js", "dist/main.js"]
