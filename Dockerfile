FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY shared/package*.json ./shared/

# Install workspace dependencies cleanly without host-only path dependencies
RUN npm ci --ignore-scripts --include-workspace-root=false || npm install --ignore-scripts --include-workspace-root=false

COPY shared ./shared
COPY server ./server
COPY client ./client

