FROM node:22-alpine AS base

WORKDIR /app

# Instalar dependencias (capa separada para aprovechar cache de Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# Exponer el puerto en el que corre Fastify
EXPOSE 4000

# Arrancar el servidor compilado
CMD ["npm", "start"]