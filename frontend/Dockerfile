FROM node:20-alpine AS build

WORKDIR /var/www

# Accept build arguments
ARG BUILD_NUMBER=unknown
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=unknown
ARG BUILD_DATE=unknown

# Set environment variables from build args
ENV BUILD_NUMBER=$BUILD_NUMBER
ENV GIT_COMMIT=$GIT_COMMIT
ENV GIT_BRANCH=$GIT_BRANCH
ENV BUILD_DATE=$BUILD_DATE

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Ensure config directories exist and generate configs
RUN mkdir -p src/config && \
    npm run generate-config

# Generate build info with passed environment variables
RUN node scripts/generateBuildInfo.js

# Build the application
RUN npm run build

FROM caddy:2-alpine

# Copy the generated files from build stage
COPY --from=build /var/www/dist /usr/share/caddy
COPY --from=build /var/www/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]