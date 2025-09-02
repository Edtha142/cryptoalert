# frontend/Dockerfile - CORREGIDO PARA RASPBERRY PI ARM64
FROM node:18-alpine as build

WORKDIR /app

# Instalar dependencias del sistema necesarias para ARM64
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Limpiar cache de npm y reinstalar todo desde cero
RUN npm cache clean --force

# Instalar dependencias sin usar cache y forzando rebuild
RUN npm ci --prefer-offline --no-audit --progress=false --force

# Copy source code
COPY . .

# Limpiar node_modules problemáticos y reinstalar rollup específicamente
RUN rm -rf node_modules/.cache && \
    npm rebuild && \
    npm install @rollup/rollup-linux-arm64-musl --save-dev --force || true

# Build con configuración específica para ARM
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Production stage
FROM nginx:alpine as production

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built files
COPY --from=build /app/dist /app/dist
COPY --from=build /app/dist /usr/share/nginx/html

# Create a script to copy files to volume
RUN echo '#!/bin/sh' > /copy-files.sh && \
    echo 'cp -r /app/dist/* /usr/share/nginx/html/' >> /copy-files.sh && \
    echo 'nginx -g "daemon off;"' >> /copy-files.sh && \
    chmod +x /copy-files.sh

EXPOSE 80

CMD ["/copy-files.sh"]