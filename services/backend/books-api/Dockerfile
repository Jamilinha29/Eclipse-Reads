FROM node:20-alpine AS shared-builder
WORKDIR /app/shared
COPY shared/package.json shared/tsconfig.json ./
COPY shared/src ./src
RUN npm install typescript@5.1.6 --no-save && npm run build

FROM node:20-alpine AS builder
WORKDIR /app/books-api
COPY books-api/package.json books-api/package-lock.json ./
COPY --from=shared-builder /app/shared /app/shared
RUN npm install file:/app/shared ws@^8.18.0 @types/ws@^8.5.13
COPY books-api/tsconfig.json ./
COPY books-api/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY books-api/package.json books-api/package-lock.json ./
COPY --from=shared-builder /app/shared /app/shared
RUN npm install --omit=dev file:/app/shared ws@^8.18.0
COPY --from=builder /app/books-api/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
