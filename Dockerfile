FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY scripts/container-start.sh ./scripts/container-start.sh
EXPOSE 3000
CMD ["sh","./scripts/container-start.sh"]
