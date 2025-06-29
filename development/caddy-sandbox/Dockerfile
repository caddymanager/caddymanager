# Build stage with specified Go version
FROM caddy:2.10.0-builder AS builder

# Install build dependencies
RUN apk add --no-cache git

# Install xcaddy
RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Build Caddy with modules
WORKDIR /src
RUN xcaddy build v2.10.0 \
    --with github.com/greenpau/caddy-security \
    --with github.com/greenpau/caddy-trace \
    --with github.com/hslatman/caddy-crowdsec-bouncer \
    --with github.com/lindenlab/caddy-s3-proxy \
    --with github.com/techknowlogick/certmagic-s3 \
    --with github.com/pberkel/caddy-storage-redis \
    --with github.com/caddy-dns/cloudflare \
    --with github.com/mholt/caddy-dynamicdns \
    --with github.com/mholt/caddy-l4 \
    --with github.com/mholt/caddy-webdav \
    --with github.com/caddyserver/cache-handler \
    --with github.com/caddyserver/replace-response \
    --with github.com/sillygod/cdp-cache \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/porech/caddy-maxmind-geolocation \
    --with github.com/WeidiDeng/caddy-cloudflare-ip \
    --with github.com/caddyserver/ntlm-transport \
    --with github.com/caddyserver/nginx-adapter \
    --with github.com/kirsch33/realip \
    --with github.com/abiosoft/caddy-exec \
    --with github.com/lolPants/caddy-requestid \
    --with github.com/mholt/caddy-events-exec \
    --with github.com/baldinof/caddy-supervisor \
    --with github.com/hairyhenderson/caddy-teapot-module \
    --with github.com/abiosoft/caddy-json-parse \
    --with github.com/imgk/caddy-trojan \
    --with github.com/lindenlab/caddy-s3-proxy \
    --with github.com/dunglas/mercure \
    --with github.com/steffenbusch/caddy-basicauth-totp \
    --with github.com/ueffel/caddy-basic-auth-filter 


# Runtime stage - use the smaller base image
FROM caddy:2.10.0

# Copy the custom binary
COPY --from=builder /src/caddy /usr/bin/caddy
