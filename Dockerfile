# Stage 1: Build the React frontend
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve the backend + static frontend
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY server/ ./server/
COPY --from=builder /app/dist ./dist

ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/index.js"]
