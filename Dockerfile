# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 VLADCAT_STANDALONE=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Only public configuration belongs in build arguments. Server secrets are runtime-only.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_VLADCAT_TOKEN_CA=""
ARG NEXT_PUBLIC_VLADCAT_X_URL=""
ARG NEXT_PUBLIC_VLADCAT_TELEGRAM_URL=""
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_VLADCAT_TOKEN_CA=$NEXT_PUBLIC_VLADCAT_TOKEN_CA \
    NEXT_PUBLIC_VLADCAT_X_URL=$NEXT_PUBLIC_VLADCAT_X_URL \
    NEXT_PUBLIC_VLADCAT_TELEGRAM_URL=$NEXT_PUBLIC_VLADCAT_TELEGRAM_URL
RUN test -n "$NEXT_PUBLIC_SUPABASE_URL" && test -n "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright HOSTNAME=0.0.0.0 PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm \
    && chmod -R a+rX /ms-playwright
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# The authority engine reads these files from disk, outside the Next.js bundle.
COPY --from=builder /app/src/game ./src/game
COPY --from=builder /app/deploy/check-browser.mjs ./deploy/check-browser.mjs
RUN mkdir -p .next/cache && chown -R node:node .next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
