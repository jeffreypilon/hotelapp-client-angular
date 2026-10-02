# syntax=docker/dockerfile:1.7

# Phase 8 Docker demo image. Builds the production bundle (angular.json's default configuration),
# then serves it from nginx. apiBaseUrl is resolved at container startup
# (docker/write-config.sh), not baked in here -- see public/config.js and core/config/env.ts.

FROM node:24-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /build/dist/hotelapp-client-angular/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/write-config.sh /docker-entrypoint.d/40-hotelapp-config.sh
RUN chmod +x /docker-entrypoint.d/40-hotelapp-config.sh
EXPOSE 80
