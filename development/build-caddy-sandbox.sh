#!/bin/bash

# build-caddy-sandbox.sh - Tool to build and run a Caddy server with popular modules installed
# Uses Docker's multi-stage build approach to create a custom Caddy binary with plugins
# Created for CaddyManager testing and development environment

set -e

# Default configuration
ADMIN_PORT=2020
HTTP_PORT=8080
HTTPS_PORT=8443
DATA_DIR="$PWD/caddy-sandbox"
CADDY_VERSION="2.10.0"
GO_VERSION="1.24.2"
DOCKER_NETWORK="caddy-test-network"
CONTAINER_NAME="caddy-sandbox"
BUILD_ONLY=false
FORCE_REBUILD=false

# List of popular Caddy modules/plugins to include
# This list has been curated based on analysis of community Caddyfiles
MODULES=(
    # Authentication and Authorization modules
    "github.com/greenpau/caddy-security"      # Authentication, authorization, and accounting (AAA) app
    "github.com/greenpau/caddy-trace"         # Request tracing and debugging
    "github.com/hslatman/caddy-crowdsec-bouncer" # CrowdSec integration for security
    
    # Storage and DNS modules
    "github.com/lindenlab/caddy-s3-proxy" # S3 proxy module
    "github.com/techknowlogick/certmagic-s3"   # S3 storage for certificates
    "github.com/pberkel/caddy-storage-redis" # Redis storage
    "github.com/caddy-dns/cloudflare"         # Cloudflare DNS provider
    "github.com/mholt/caddy-dynamicdns"       # Dynamic DNS updates
    "github.com/mholt/caddy-l4"               # Layer 4 transport handling
    "github.com/mholt/caddy-webdav"           # WebDAV support
    
    # Performance and Caching
    "github.com/caddyserver/cache-handler"    # HTTP caching
    "github.com/caddyserver/replace-response" # Response replacement
    "github.com/sillygod/cdp-cache"           # Advanced HTTP cache with stale options
    
    # Security and Rate Limiting
    "github.com/mholt/caddy-ratelimit"        # Rate limiting
    "github.com/porech/caddy-maxmind-geolocation" # Geolocation filtering
    "github.com/WeidiDeng/caddy-cloudflare-ip" # Cloudflare IP ranges
    "github.com/caddyserver/ntlm-transport"   # NTLM authentication support
    
    # Integrations and Adapters
    "github.com/caddyserver/nginx-adapter"    # Nginx config adapter
    "github.com/kirsch33/realip"              # Real IP handling
    
    # Utility modules
    "github.com/abiosoft/caddy-exec"          # Execute commands
    "github.com/lolPants/caddy-requestid"     # Request ID handling
    "github.com/mholt/caddy-events-exec"      # Events handling
    "github.com/baldinof/caddy-supervisor"    # Process supervisor
    
    # Metrics and monitoring
    "github.com/hairyhenderson/caddy-teapot-module" # HTTP 418 I'm a teapot
    "github.com/abiosoft/caddy-json-parse"       # JSON parsing

    # Additional community modules
    "github.com/imgk/caddy-trojan"            # Trojan protocol support
    "github.com/lindenlab/caddy-s3-proxy"     # S3 proxy module
    "github.com/dunglas/mercure"        # Mercure module for real-time updates
    "github.com/steffenbusch/caddy-basicauth-totp"      # Basic authentication module with TOTP
    "github.com/ueffel/caddy-basic-auth-filter" # Basic auth with IP filtering
)

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -p|--admin-port) ADMIN_PORT="$2"; shift ;;
        --http-port) HTTP_PORT="$2"; shift ;;
        --https-port) HTTPS_PORT="$2"; shift ;;
        -d|--data-dir) DATA_DIR="$2"; shift ;;
        -v|--version) CADDY_VERSION="$2"; shift ;;
        -g|--go-version) GO_VERSION="$2"; shift ;;
        -n|--name) CONTAINER_NAME="$2"; shift ;;
        --build-only) BUILD_ONLY=true ;;
        -f|--force-rebuild) FORCE_REBUILD=true ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -p, --admin-port PORT     Set admin API port (default: 2020)"
            echo "  --http-port PORT          Set HTTP port (default: 8080)"
            echo "  --https-port PORT         Set HTTPS port (default: 8443)" 
            echo "  -d, --data-dir DIR        Set data directory (default: ./caddy-sandbox)"
            echo "  -v, --version VERSION     Set Caddy version (default: 2.7.6)"
            echo "  -g, --go-version VERSION  Set Go version for building (default: 1.24.2)"
            echo "  -n, --name NAME           Container name (default: caddy-sandbox)"
            echo "  --build-only              Only build the custom Caddy image, don't start a container"
            echo "  -f, --force-rebuild       Force rebuild even if image exists"
            echo "  -h, --help                Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo "╔════════════════════════════════════════════╗"
echo "║            CADDY SANDBOX BUILDER           ║"
echo "╚════════════════════════════════════════════╝"
echo "Building Caddy v$CADDY_VERSION with community modules"
echo "Using Go version: $GO_VERSION"
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    echo "Visit https://docs.docker.com/get-docker/ for installation instructions."
    exit 1
fi

# Create Docker network if it doesn't exist
if ! docker network inspect "$DOCKER_NETWORK" &> /dev/null; then
    echo "Creating Docker network: $DOCKER_NETWORK"
    docker network create "$DOCKER_NETWORK"
else
    echo "Using existing Docker network: $DOCKER_NETWORK"
fi

# Create data directories if they don't exist
mkdir -p "$DATA_DIR/config/caddy"
mkdir -p "$DATA_DIR/data"

# Create a Caddyfile
cat > "$DATA_DIR/Caddyfile" << EOF
{
    # Global options
    admin 0.0.0.0:$ADMIN_PORT
    
    # Enable debugging
    debug
}

# HTTP Server with restricted API access
:$HTTP_PORT {
    # Block access to all admin API endpoints except /adapt
    @blocked_admin_paths {
        path /config* /id* /reverse_proxy* /metrics* /load* /stop*
        not method POST
    }
    
    handle @blocked_admin_paths {
        respond 403
    }
    
    # Allow POST /adapt endpoint for file conversion
    @allow_adapt {
        path /adapt
        method POST
    }
    
    handle @allow_adapt {
        # Pass requests to the admin API
        reverse_proxy http://localhost:$ADMIN_PORT
    }
    
    # Root handler with simple info page
    handle / {
        respond "Caddy Sandbox Server - Only the POST /adapt endpoint is publicly accessible."
    }
    
    # Default handler for all other paths
    handle {
        respond 404
    }
}
EOF

# Create a Dockerfile for building custom Caddy
create_dockerfile() {
    local dockerfile="$DATA_DIR/Dockerfile"
    
    echo "Creating Dockerfile for custom Caddy build..."
    cat > "$dockerfile" << EOF
# Build stage with specified Go version
FROM caddy:$CADDY_VERSION-builder AS builder

# Install build dependencies
RUN apk add --no-cache git

# Install xcaddy
RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# Build Caddy with modules
WORKDIR /src
RUN xcaddy build v$CADDY_VERSION \\
EOF

    # Add all modules to the Dockerfile
    for module in "${MODULES[@]}"; do
        echo "    --with $module \\" >> "$dockerfile"
    done

    # Remove the trailing backslash from the last line and add a newline
    sed -i.bak '$ s/\\$//' "$dockerfile" && rm "${dockerfile}.bak" 2>/dev/null || true
    echo >> "$dockerfile"

    # Add the runtime stage
    cat >> "$dockerfile" << EOF

# Runtime stage - use the smaller base image
FROM caddy:$CADDY_VERSION

# Copy the custom binary
COPY --from=builder /src/caddy /usr/bin/caddy
EOF

    echo "Dockerfile created at $dockerfile"
}

# Build the custom Caddy Docker image
build_custom_caddy() {
    local image_name="custom-caddy-sandbox:$CADDY_VERSION"
    
    echo "Building custom Caddy Docker image with plugins..."
    create_dockerfile
    
    docker build -t "$image_name" -f "$DATA_DIR/Dockerfile" "$DATA_DIR"
    
    if [ $? -ne 0 ]; then
        echo "Failed to build custom Caddy Docker image"
        exit 1
    fi
    
    echo "Custom Caddy Docker image built successfully: $image_name"
    return 0
}

# Function to stop existing container
stop_existing_container() {
    echo "Stopping any existing Caddy sandbox container..."
    docker rm -f "$CONTAINER_NAME" &> /dev/null || true
}

# Function to start the Caddy sandbox container
start_caddy_container() {
    local image_name="custom-caddy-sandbox:$CADDY_VERSION"
    
    echo "Starting Caddy sandbox container..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network "$DOCKER_NETWORK" \
        -p "$ADMIN_PORT:$ADMIN_PORT" \
        -p "$HTTP_PORT:$HTTP_PORT" \
        -p "$HTTPS_PORT:$HTTPS_PORT" \
        -v "$DATA_DIR/Caddyfile:/etc/caddy/Caddyfile" \
        -v "$DATA_DIR/data:/data" \
        -v "$DATA_DIR/config:/config" \
        "$image_name"
    
    if [ $? -ne 0 ]; then
        echo "Failed to start Caddy sandbox container"
        exit 1
    fi
    
    echo "Caddy sandbox container started with:"
    echo "  - Container name: $CONTAINER_NAME"
    echo "  - Admin API: http://localhost:$ADMIN_PORT"
    echo "  - HTTP endpoint: http://localhost:$HTTP_PORT"
}

# Check if we need to rebuild
need_rebuild=false
if [ "$FORCE_REBUILD" = true ]; then
    need_rebuild=true
else
    # Check if the image exists
    if ! docker image inspect "custom-caddy-sandbox:$CADDY_VERSION" &> /dev/null; then
        need_rebuild=true
    fi
fi

# Build the custom Caddy image if needed
if [ "$need_rebuild" = true ]; then
    build_custom_caddy
else
    echo "Custom Caddy Docker image already exists. Use --force-rebuild to rebuild."
fi

# Stop here if build-only flag is set
if [ "$BUILD_ONLY" = true ]; then
    echo "Build-only flag set. Exiting without starting container."
    exit 0
fi

# Stop any existing container
stop_existing_container

# Start the container
start_caddy_container

echo
echo "╔════════════════════════════════════════════╗"
echo "║         CADDY SANDBOX SERVER READY         ║"
echo "╚════════════════════════════════════════════╝"
echo "Admin API: http://localhost:$ADMIN_PORT"
echo "HTTP endpoint: http://localhost:$HTTP_PORT"
echo "HTTPS endpoint: https://localhost:$HTTPS_PORT"
echo
echo "To add this server to CaddyManager:"
echo "1. Go to the Servers page in CaddyManager"
echo "2. Click 'Add Server'"
echo "3. Use the following settings:"
echo "  - Name: Caddy Sandbox"
echo "  - API URL: http://localhost"
echo "  - API Port: $ADMIN_PORT"
echo "  - Admin API Path: /config/"
echo
echo "To view server logs:"
echo "docker logs -f $CONTAINER_NAME"
echo
echo "To stop the container:"
echo "docker stop $CONTAINER_NAME"