# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
# Install only production dependencies
RUN npm ci --only=production

# Copy compiled JavaScript files
COPY --from=builder /usr/src/app/dist ./dist

# Copy non-JS assets required at runtime (e.g. database schema SQL)
COPY --from=builder /usr/src/app/src/db/schema.sql ./dist/db/schema.sql

EXPOSE 3001

CMD ["node", "dist/index.js"]
