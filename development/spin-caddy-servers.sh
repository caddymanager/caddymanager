#!/bin/bash

# spin-caddy-servers.sh - Tool to spin up multiple Caddy servers with admin APIs enabled
# Uses Docker containers to provide isolated environments
# Created for CaddyManager testing and development

set -e

# Default configuration
START_PORT=2019
NUM_SERVERS=3
DATA_DIR="$PWD/caddy-servers"
BASE_HTTP_PORT=8000
DOCKER_NETWORK="caddy-test-network"
CADDY_IMAGE="caddy:2.10-alpine"

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -n|--number) NUM_SERVERS="$2"; shift ;;
        -p|--start-port) START_PORT="$2"; shift ;;
        -d|--data-dir) DATA_DIR="$2"; shift ;;
        -h|--http-port) BASE_HTTP_PORT="$2"; shift ;;
        -i|--image) CADDY_IMAGE="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

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
mkdir -p "$DATA_DIR"

# Function to create a Caddyfile for a specific instance
create_caddyfile() {
    local instance_num="$1"
    local admin_port="$2"
    local http_port="$3"
    local data_dir="$4"
    local instance_dir="$data_dir/server-$instance_num"
    
    mkdir -p "$instance_dir/data"
    mkdir -p "$instance_dir/config"
    
    cat > "$instance_dir/Caddyfile" << EOF
{
    admin 0.0.0.0:$admin_port
    # Use default storage locations in the container
}

:80 {
    respond "Hello from Caddy Server #$instance_num running on container port 80 (host port $http_port) with admin API on port $admin_port"
}
EOF

    echo "Created Caddyfile for server #$instance_num in $instance_dir"
    return 0
}

# Function to start a Caddy Docker container
start_caddy_container() {
    local instance_num="$1"
    local admin_port="$2"
    local http_port="$3"
    local data_dir="$4"
    local instance_dir="$data_dir/server-$instance_num"
    local container_name="caddy-server-$instance_num"
    
    echo "Starting Caddy Docker container #$instance_num..."
    
    # Stop and remove the container if it already exists
    docker rm -f "$container_name" &> /dev/null || true
    
    # Start the container with the appropriate ports and volumes
    docker run -d \
        --name "$container_name" \
        --network "$DOCKER_NETWORK" \
        -p "$admin_port:$admin_port" \
        -p "$http_port:80" \
        -v "$instance_dir/Caddyfile:/etc/caddy/Caddyfile" \
        -v "$instance_dir/data:/data" \
        -v "$instance_dir/config:/config" \
        "$CADDY_IMAGE"
    
    echo "Caddy container #$instance_num started with:"
    echo "  - Container name: $container_name"
    echo "  - Admin API: http://localhost:$admin_port"
    echo "  - HTTP endpoint: http://localhost:$http_port"
    echo ""
}

# Function to stop all Caddy containers
stop_all_containers() {
    echo "Stopping any existing Caddy containers..."
    docker ps -q --filter "name=caddy-server-" | xargs -r docker rm -f
    echo "All existing Caddy containers stopped."
}

# Stop all running Caddy containers
stop_all_containers

# Create and start the containers
echo "Spinning up $NUM_SERVERS Caddy servers as Docker containers..."

for ((i=1; i<=NUM_SERVERS; i++)); do
    admin_port=$((START_PORT + i - 1))
    http_port=$((BASE_HTTP_PORT + i - 1))
    
    create_caddyfile "$i" "$admin_port" "$http_port" "$DATA_DIR"
    start_caddy_container "$i" "$admin_port" "$http_port" "$DATA_DIR"
done

echo "All Caddy servers are running in Docker containers!"
echo ""
echo "Docker containers:"
docker ps --filter "name=caddy-server-"
echo ""
echo "To add these servers to CaddyManager:"
echo "1. Go to the Servers page in CaddyManager"
echo "2. Click 'Add Server'"
echo "3. Use the following settings for each server:"
echo ""

for ((i=1; i<=NUM_SERVERS; i++)); do
    admin_port=$((START_PORT + i - 1))
    container_name="caddy-server-$i"
    echo "Server #$i:"
    echo "  - Name: $container_name"
    echo "  - API URL: http://localhost"
    echo "  - API Port: $admin_port"
    echo "  - Admin API Path: /config/"
    echo ""
done

echo "To stop all containers, run:"
echo "./spin-caddy-servers.sh --number 0"
echo "or"
echo "docker ps -q --filter \"name=caddy-server-\" | xargs -r docker rm -f"