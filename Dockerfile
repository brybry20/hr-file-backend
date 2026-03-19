FROM node:22-slim

WORKDIR /opt/render/project/src

# Install necessary build tools for sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --build-from-source

COPY . .

EXPOSE 3001
CMD ["node", "server.js"]