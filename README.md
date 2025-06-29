# CaddyManager

Easily manage your Caddy2 servers using a modern web UI, built on the MEVN stack (MongoDB, Express, Vue, Node.js).

---

## 🚀 Features

- **Multi-Server Management:**
  - Add, remove, and monitor multiple Caddy2 servers from a single dashboard.
- **Configuration Editor:**
  - Create, edit, and validate Caddyfiles with syntax highlighting and templates.
- **User Authentication:**
  - Secure login, JWT-based sessions, and role-based access control.
- **API Key Management:**
  - Generate and revoke API keys for programmatic access.
- **Audit Logging:**
  - Track all user and system actions for security and compliance.
- **Real-Time Status:**
  - Live server health checks and status updates.
- **Integrated Swagger API Docs:**
  - Explore and test backend APIs directly from the UI.
- **Responsive Design:**
  - Works great on desktop and mobile devices.

---

## 📦 Tech Stack
- **Frontend:** Vue 3, Vite, Pinia, Vue Router
- **Backend:** Node.js, Express, MongoDB
- **Caddy Integration:** RESTful API for Caddy2 server management

---

## 🧪 Development: Caddy Test Servers

For local testing with real Caddy servers, see [`development/USAGE.md`](development/USAGE.md) for scripts to:
- Build and run a custom Caddy sandbox server with popular plugins
- Spin up multiple vanilla Caddy servers for multi-server testing

---

## 🛠️ Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/YOUR_USERNAME/caddymanager.git
   cd caddymanager
   ```
2. **Install dependencies:**
   ```sh
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Configure environment:**
   - Copy `.env.example` to `.env` in both `backend/` and `frontend/` and update values as needed.
4. **Run the app:**
   - Start backend:
     ```sh
     cd backend && npm start
     ```
   - Start frontend:
     ```sh
     cd frontend && npm run dev
     ```

---

## 🧩 Environment Variables

### Frontend
- `API_BASE_URL`
- `APP_NAME`
- `DARK_MODE`

### Backend
- `PORT`
- `NODE_ENV`
- `MONGODB_URI`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `DEFAULT_CADDY_ADMIN_USER`
- `DEFAULT_CADDY_ADMIN_PASSWORD`
- `CADDY_SANDBOX_URL`
- `PING_INTERVAL`
- `PING_TIMEOUT`
- `AUDIT_LOG_MAX_SIZE_MB`
- `AUDIT_LOG_RETENTION_DAYS`

---

## 📚 Documentation
- [Caddy Documentation](https://caddyserver.com/docs/)
- [Swagger API Docs](http://localhost:3000/api-docs) (after starting backend)

---

## 🤝 Contributing
Contributions are welcome! Please open issues and pull requests to help improve CaddyManager.

---

## 🛡️ License
This project is open source and available under the [MIT License](LICENSE).

---

## 📢 Status
This project is in active development, gearing up for a v0.1 release. Feedback and testing are appreciated!

---

## 🐳 Docker Compose Example

Below is a sample `docker-compose.yml` for running both backend and frontend. Instead of referencing `.env` files, environment variables are listed explicitly for clarity:

```yaml
services:
  backend:
    image: ghcr.io/caddymanager/caddymanager-backend:stable
    container_name: caddymanager-backend
    restart: unless-stopped
    environment:
      - PORT=3000
      - MONGODB_URI=
      - CORS_ORIGIN=http://localhost:5173
      - LOG_LEVEL=debug
      - DEFAULT_CADDY_ADMIN_USER=admin
      - DEFAULT_CADDY_ADMIN_PASSWORD=caddyrocks
      - CADDY_SANDBOX_URL=http://localhost:2019
      - PING_INTERVAL=30000
      - PING_TIMEOUT=2000
      - AUDIT_LOG_MAX_SIZE_MB=100
      - AUDIT_LOG_RETENTION_DAYS=90
    ports:
      - "3000:3000"
    networks:
      - caddymanager

  frontend:
    image: ghcr.io/caddymanager/caddymanager-frontend:stable
    container_name: caddymanager-frontend
    restart: unless-stopped
    environment:
      - API_BASE_URL=http://localhost:3000/api/v1
      - APP_NAME=Caddy Manager
      - DARK_MODE=true
    ports:
      - "80:80"
    networks:
      - caddymanager

networks:
  caddymanager:
    driver: bridge
```