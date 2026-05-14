FROM node:20-alpine

WORKDIR /app

# Build tools required by better-sqlite3 (native addon)
RUN apk add --no-cache python3 make g++

# Install server deps
COPY package*.json ./
RUN npm ci --omit=dev

# Install and build client
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Copy server source
COPY server/ ./server/
COPY .env.example ./

EXPOSE 3000

CMD ["node", "server/index.js"]
