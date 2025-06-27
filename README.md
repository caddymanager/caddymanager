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