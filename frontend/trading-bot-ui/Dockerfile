# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm ci

# Copie des sources
COPY . .

# Build de l'application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copie de la configuration nginx
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers de build
COPY --from=build /app/build /usr/share/nginx/html

# Configuration des variables d'environnement
ENV NODE_ENV=production

# Exposition du port
EXPOSE 80

# Commande de démarrage
CMD ["nginx", "-g", "daemon off;"] 