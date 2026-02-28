FROM node:20-alpine

WORKDIR /app

# bcrypt requires native build tools on Alpine
RUN apk add --no-cache python3 make g++

ENV NODE_ENV=production

# Copy package info and install
COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copy application code
COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
