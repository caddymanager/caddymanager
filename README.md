# CaddyManager

Easily manage your Caddy2 servers using a modern web UI, built on the MEVN stack with support for both SQLite and MongoDB databases.

> **Caution:** CaddyManager is in early development. Please _backup your Caddy configurations_ and data before testing. Use at your own risk.


---

![CaddyManager Demo](https://caddymanager.online/screenshots/screenshots.gif)

## 🚀 Features

- **Dual Database Support:**
  - Choose between SQLite (default, zero-setup) or MongoDB for data storage.
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

## 📢 Status
This project is in active development, gearing up for a v0.1 release. Feedback and testing are appreciated!

---

## 🐳 Docker Compose Example

Below is a sample `docker-compose.yml` for running both backend and frontend. CaddyManager uses SQLite by default for zero-configuration setup, but you can optionally use MongoDB:

```yaml
services:
  # MongoDB database for persistent storage (optional - SQLite is used by default)
  mongodb:
    image: mongo:8.0
    container_name: caddymanager-mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=mongoadmin
      - MONGO_INITDB_ROOT_PASSWORD=someSecretPassword  # Change for production!
    ports:
      - "27017:27017"  # Expose for local dev, remove for production
    volumes:
      - mongodb_data:/data/db
    networks:
      - caddymanager
    profiles:
      - mongodb  # Use 'docker-compose --profile mongodb up' to include MongoDB

  # Backend API server
  backend:
    image: caddymanager/caddymanager-backend:latest
    container_name: caddymanager-backend
    restart: unless-stopped
    environment:
      - PORT=3000
      # Database Engine Configuration (defaults to SQLite)
      - DB_ENGINE=sqlite  # Options: 'sqlite' or 'mongodb'
      # SQLite Configuration (used when DB_ENGINE=sqlite)
      - SQLITE_DB_PATH=/app/data/caddymanager.sqlite
      # MongoDB Configuration (used when DB_ENGINE=mongodb)
      - MONGODB_URI=mongodb://mongoadmin:someSecretPassword@mongodb:27017/caddymanager?authSource=admin
      - CORS_ORIGIN=http://localhost:5173
      - LOG_LEVEL=debug
      - CADDY_SANDBOX_URL=http://localhost:2019
      - PING_INTERVAL=30000
      - PING_TIMEOUT=2000
      - AUDIT_LOG_MAX_SIZE_MB=100
      - AUDIT_LOG_RETENTION_DAYS=90
      - JWT_SECRET=your_jwt_secret_key_here  # Change for production!
      - JWT_EXPIRATION=24h
    ports:
      - "3000:3000"  # Expose API
    volumes:
      - sqlite_data:/app/data  # SQLite database storage
    networks:
      - caddymanager

  # Frontend web UI
  frontend:
    image: caddymanager/caddymanager-frontend:latest
    container_name: caddymanager-frontend
    restart: unless-stopped
    depends_on:
      - backend
    environment:
      - API_BASE_URL=http://backend:3000/api/v1
      - APP_NAME=Caddy Manager
      - DARK_MODE=true
    ports:
      - "80:80"  # Expose web UI
    networks:
      - caddymanager

networks:
  caddymanager:
    driver: bridge

volumes:
  mongodb_data:  # Only used when MongoDB profile is active
  sqlite_data:   # SQLite database storage

# Notes:
# - SQLite is the default database engine - no additional setup required!
# - To use MongoDB instead, set DB_ENGINE=mongodb and start with: docker-compose --profile mongodb up
# - For production, use strong passwords and consider secrets management.
# - The backend uses SQLite by default, storing data in a persistent volume.
# - Remove or restrict published ports in production environments.
```

---

## 🧩 Environment Variables

### Frontend (`frontend/.env`)
Create a `.env` file in the `frontend/` directory with the following variables:

```
API_BASE_URL=http://localhost:3000/api/v1
APP_NAME=Caddy Manager
DARK_MODE=true
```
- `API_BASE_URL`: The base URL for backend API requests - should be the url for your backend api
- `APP_NAME`: The display name for the app UI.
- `DARK_MODE`: Set to `true` to enable dark mode by default. Currently not integrated fully.

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory with the following variables:

```
PORT=3000
# Database Engine Configuration
DB_ENGINE=sqlite  # Options: 'sqlite' or 'mongodb'
# SQLite Configuration (used when DB_ENGINE=sqlite)
SQLITE_DB_PATH=./caddymanager.sqlite
# MongoDB Configuration (used when DB_ENGINE=mongodb)
MONGODB_URI=mongodb://mongoadmin:someSecretPassword@localhost:27017/caddymanager?authSource=admin
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
CADDY_SANDBOX_URL=http://localhost:2019
PING_INTERVAL=30000
PING_TIMEOUT=2000
AUDIT_LOG_MAX_SIZE_MB=100
AUDIT_LOG_RETENTION_DAYS=90
JWT_SECRET=your_jwt_secret_key_here  # Change for production!
JWT_EXPIRATION=24h
```
- `PORT`: Port for the backend server.
- `DB_ENGINE`: Database engine to use (`sqlite` or `mongodb`). Defaults to `sqlite`.
- `SQLITE_DB_PATH`: Path to SQLite database file (used when `DB_ENGINE=sqlite`).
- `MONGODB_URI`: MongoDB connection string (used when `DB_ENGINE=mongodb`).
- `CORS_ORIGIN`: Allowed origin for frontend requests - should be the url of your frontend.
- `LOG_LEVEL`: Logging verbosity.
- `CADDY_SANDBOX_URL`: URL for the Caddy sandbox server (for testing) and/or validating configs.
- `PING_INTERVAL` / `PING_TIMEOUT`: Health check intervals (ms).
- `AUDIT_LOG_MAX_SIZE_MB` / `AUDIT_LOG_RETENTION_DAYS`: Audit log settings.
- `JWT_SECRET` / `JWT_EXPIRATION`: JWT credential settings

> **Note:** The default CaddyManager user when first creating the app is `admin` with password `caddyrocks`. You can change this after logging in.

> **Tip:** Copy `.env.example` to `.env` in each directory and adjust values as needed for your environment.

---

## 🗄️ Database Options

CaddyManager supports two database engines:

### SQLite (Default)
- **Zero Configuration**: Works out of the box, no setup required
- **Single File**: All data stored in a single `.sqlite` file
- **Perfect for**: Small to medium deployments, development, testing
- **Automatic Setup**: Creates admin user (`admin`/`caddyrocks`) on first run

### MongoDB
- **Scalable**: Better for high-traffic, multi-user environments
- **Perfect for**: Large deployments
- **Setup Required**: Requires MongoDB server installation

To switch between databases, simply change the `DB_ENGINE` environment variable and restart the backend.

---

## 📚 Documentation
- [Caddy Documentation](https://caddyserver.com/docs/)
- [CaddyManager Docs](https://caddymanager.online/#/docs)
- [Swagger API Docs](http://localhost:3000/api-docs) (after starting backend)

---

## 🤝 Contributing
Contributions are welcome! Please open issues and pull requests to help improve CaddyManager.

---

## 📦 Tech Stack
- **Frontend:** Vue 3, Vite, Pinia, Vue Router
- **Backend:** Node.js, Express
- **Database:** SQLite (default) or MongoDB
- **Caddy Integration:** RESTful API for Caddy2 server management

---

## 🧪 Development: Caddy Test Servers

For local testing with real Caddy servers, see [`development/USAGE.md`](development/USAGE.md) for scripts to:
- Build and run a custom Caddy sandbox server with popular plugins
- Spin up multiple vanilla Caddy servers for multi-server testing

---

## 🛠️ Getting Started using local development environment

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
3. **Configure environment (optional):**
   - SQLite works out of the box with no configuration needed!
   - For custom settings, copy `.env.example` to `.env` in both `backend/` and `frontend/` directories
4. **Run the app:**
   - Start backend:
     ```sh
     cd backend && npm start
     ```
   - Start frontend:
     ```sh
     cd frontend && npm run dev
     ```
5. **Login:**
   - Default admin credentials: `admin` / `caddyrocks`

---

## 🖥️ How to Use CaddyManager

1. **Access the Web UI:**
   - Open your browser and go to `http://localhost` (or the address where your frontend is running).

2. **Sign In:**
   - Log in using the default admin credentials (`admin` / `caddyrocks`).

3. **Add and Manage Servers:**
   - Navigate to the "Servers" section to add, edit, or remove Caddy servers.
   - You can monitor server status and view details for each server.

4. **Edit Configurations:**
   - Use the "Configurations" section to create, edit, and validate Caddyfiles.
   - Built-in syntax highlighting and templates help you avoid errors.

5. **User & API Key Management:**
   - Manage users and roles in the "User Management" section (admin only).
   - Generate and revoke API keys for programmatic access in the "API Keys" section.

6. **Audit Logs & Status:**
   - View audit logs for all user/system actions in the "Audit Logs" section (admin only).

7. **API Documentation:**
   - Explore and test backend APIs via the integrated Swagger UI at `/api-docs` (e.g., `http://localhost:3000/api-docs`).

---

## 🛡️ License & Legal
This project is open source and available under the [MIT License](LICENSE).

This project is not endorsed by, directly affiliated with, maintained, authorized, or sponsored by Caddy, Matthew Holt, Stack Holdings GmbH, or ZeroSSL. The name "Caddy" is a registered trademark of Stack Holdings GmbH. All information about Caddy, its history, and trademarks is provided for reference only.

---

## 📬 Get in Touch

Have questions, feedback, or want to contribute? Feel free to reach out:

- Email: [bastian@bastianstolk.com](mailto:bastian@bastianstolk.com)
- Open an issue or pull request on GitHub
