FROM oven/bun:1 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1

WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/server.ts ./server.ts
COPY --from=build /app/src/utils/pricing.ts ./src/utils/pricing.ts
COPY --from=build /app/src/types ./src/types

EXPOSE 8080
CMD ["bun", "run", "start"]
