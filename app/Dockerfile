# D:\Projekte\efi25\app\Dockerfile

# STAGE 1: Build-Umgebung
FROM node:20-alpine as build
WORKDIR /app

# package*.json kopieren und Abhängigkeiten installieren
COPY package.json package-lock.json ./
RUN npm install

# Quellcode kopieren und Build ausführen
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "5173"]
