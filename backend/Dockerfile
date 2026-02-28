FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package info
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Cloud Run uses PORT env var (default 8080)
EXPOSE 8080

# Start command
CMD ["node", "server.js"]
