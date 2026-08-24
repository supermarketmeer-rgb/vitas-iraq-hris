FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build Vite static assets
RUN npm run build

# Expose port
EXPOSE 5000

ENV PORT=5000

# Start Express server
CMD ["node", "server.js"]
