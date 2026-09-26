FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
# Mã nguồn migration/seed để chạy one-off task trên môi trường không truy cập DB từ ngoài được (vd. ECS + RDS private):
#   node_modules/.bin/typeorm-ts-node-commonjs -d typeorm.config.ts migration:run
#   node_modules/.bin/ts-node scripts/seed.ts
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json /app/typeorm.config.ts ./
COPY --from=builder --chown=nestjs:nodejs /app/src ./src
COPY --from=builder --chown=nestjs:nodejs /app/database ./database
COPY --from=builder --chown=nestjs:nodejs /app/scripts ./scripts
# CA bundle của Amazon RDS, dùng với DB_SSL=true + DB_SSL_CA_PATH
ADD --chown=nestjs:nodejs https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem ./certs/rds-global-bundle.pem
USER nestjs
EXPOSE 4000
CMD ["node", "dist/main.js"]
