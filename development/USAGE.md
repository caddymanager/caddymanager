# Development Scripts: Caddy Test Servers

This project provides two helper scripts for spinning up Caddy servers in Docker for local development and testing with CaddyManager.

---

## 1. `development/build-caddy-sandbox.sh`

**Purpose:**
- Builds a custom Caddy Docker image with a wide selection of popular community modules/plugins.
- Spins up a single Caddy server ("sandbox") with a restrictive Caddyfile for safe API testing.

**Usage:**
```sh
cd development
./build-caddy-sandbox.sh [options]
```

**Common Options:**
- `-p, --admin-port <PORT>`: Set admin API port (default: 2020)
- `--http-port <PORT>`: Set HTTP port (default: 8080)
- `--https-port <PORT>`: Set HTTPS port (default: 8443)
- `-d, --data-dir <DIR>`: Set data directory (default: ./caddy-sandbox)
- `-v, --version <VERSION>`: Set Caddy version (default: 2.10.0)
- `-g, --go-version <VERSION>`: Set Go version for building (default: 1.24.2)
- `-n, --name <NAME>`: Container name (default: caddy-sandbox)
- `--build-only`: Only build the image, do not start the container
- `-f, --force-rebuild`: Force rebuild even if image exists
- `-h, --help`: Show help

**Example:**
```sh
./build-caddy-sandbox.sh --admin-port 2021 --http-port 8081
```

**What it does:**
- Builds a custom Caddy Docker image with many plugins.
- Creates a data directory and Caddyfile for the sandbox.
- Starts a Docker container with the admin API and HTTP endpoints exposed.
- Prints instructions for adding the server to CaddyManager and managing the container.

---

## 2. `development/spin-caddy-servers.sh`

**Purpose:**
- Spins up multiple vanilla Caddy servers (no custom plugins) in Docker, each with its own admin API port and HTTP port.
- Useful for simulating a multi-server environment for CaddyManager development.

**Usage:**
```sh
cd development
./spin-caddy-servers.sh [options]
```

**Common Options:**
- `-n, --number <N>`: Number of servers to start (default: 3)
- `-p, --start-port <PORT>`: Starting admin API port (default: 2019)
- `-d, --data-dir <DIR>`: Data directory (default: ./caddy-servers)
- `-h, --http-port <PORT>`: Starting HTTP port (default: 8000)
- `-i, --image <IMAGE>`: Caddy Docker image (default: caddy:2.10-alpine)

**Example:**
```sh
./spin-caddy-servers.sh --number 5 --start-port 3000 --http-port 9000
```

**What it does:**
- Stops any running Caddy containers with the naming pattern `caddy-server-*`.
- Creates a data directory and Caddyfile for each server.
- Starts each server in its own Docker container, mapping admin and HTTP ports.
- Prints connection info and instructions for adding each server to CaddyManager.

---

## Notes
- Both scripts require Docker to be installed and running.
- The sandbox script is best for testing Caddy plugins and API endpoints.
- The multi-server script is best for simulating a fleet of Caddy servers for dashboard development.
