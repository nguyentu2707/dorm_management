FROM node:22-bookworm-slim AS builder

WORKDIR /workspace

COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

COPY backend/package*.json ./backend/
RUN npm ci --prefix backend

COPY frontend ./frontend
COPY backend ./backend

# The deployed UI and API share one origin. An environment variable takes
# precedence over frontend/.env when Vite creates the production bundle.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm --prefix frontend run build
RUN npm --prefix backend run build
RUN npm --prefix backend exec -- tsc -p backend/tsconfig.scripts.json

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json ./backend/
RUN npm ci --prefix backend --omit=dev && npm cache clean --force

COPY --from=builder /workspace/backend/dist ./backend/dist
COPY --from=builder /workspace/backend/dist-scripts ./backend/dist-scripts
COPY --from=builder /workspace/backend/migrations ./backend/migrations
COPY --from=builder /workspace/backend/scripts ./backend/scripts
COPY --from=builder /workspace/frontend/dist ./frontend/dist

WORKDIR /app/backend

EXPOSE 3000

CMD ["sh", "-c", "node scripts/migrate.mjs up && node dist/server.js"]
