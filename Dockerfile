# Dockerfile para rodar frontend + backend juntos
FROM node:22-alpine AS builder

WORKDIR /app

# Backend deps
COPY package*.json ./
RUN npm install --ignore-scripts

# Frontend deps
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy source
COPY . .

# Build both
RUN npm run build
RUN cd frontend && npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
