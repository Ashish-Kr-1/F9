FROM node:18-alpine

WORKDIR /app

# Copy package info
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose backend API port
EXPOSE 8000

# Start command
CMD ["npm", "start"]
