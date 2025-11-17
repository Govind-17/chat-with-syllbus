# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# Build arg to set API base at build time (defaults to /api to work with nginx proxy)
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
	elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
	elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
	else npm install; fi

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

# Nginx config with proxy for /api to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist .

EXPOSE 80

# Healthcheck for frontend
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
	CMD wget -q -O - http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]


