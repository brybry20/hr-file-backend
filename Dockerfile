FROM node:22-bullseye

WORKDIR /usr/src/app

# Kopyahin lamang ang package files para magamit ang Docker cache
COPY package*.json ./

# I-clear ang npm cache at mag-install nang direkta mula sa source
RUN npm cache clean --force && \
    npm install --build-from-source

# Kopyahin ang natitirang source code
COPY . .

EXPOSE 3001

CMD ["node", "server.js"]