# Build stage
FROM node:18 as build

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./
RUN npm install

# Copie du code source
COPY . .

# Build de l'application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copie de la configuration nginx
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers statiques buildés
COPY --from=build /app/build /usr/share/nginx/html

# Note: On ne copie plus les fichiers statiques individuellement car ils sont déjà inclus dans le build

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"] 