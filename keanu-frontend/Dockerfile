# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build args for Vite (must be available at build time)
ARG VITE_API_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY

# Ensure variables reaching build context are baked into .env
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env
RUN echo "VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY}" >> .env

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Add nginx config to handle client-side routing
RUN echo 'server { \
    listen       80; \
    listen  [::]:80; \
    server_name  localhost; \
    \
    location / { \
    root   /usr/share/nginx/html; \
    index  index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    \
    error_page   500 502 503 504  /50x.html; \
    location = /50x.html { \
    root   /usr/share/nginx/html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
