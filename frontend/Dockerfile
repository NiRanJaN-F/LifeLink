# ==============================================================================
# LifeLink Frontend Multi-Stage Dockerfile
# Stage 1: Build static assets with Node
# Stage 2: Serve production assets via Nginx
# ==============================================================================

# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Accept build argument for backend API URL
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Server Stage
FROM nginx:1.27-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
